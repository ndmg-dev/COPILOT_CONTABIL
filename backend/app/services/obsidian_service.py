"""
Copiloto Contábil IA — Obsidian Integration Service
Syncs Obsidian vault notes into the RAG knowledge base.

Supports two modes:
  1. Local REST API (requires the 'Local REST API' Obsidian plugin)
  2. Direct Filesystem scan (reads .md files from a configured vault path)

The service parses Markdown with structure-aware chunking (by headers),
extracts YAML frontmatter metadata, resolves [[wikilinks]] context,
and feeds chunks into the existing pgvector embedding pipeline.
"""
import io
import os
import re
import uuid
import yaml
import logging
import hashlib
from typing import Optional
from datetime import datetime, timezone
from pathlib import Path

import httpx
from app.config import get_settings
from app.supabase_client import get_admin_singleton

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────
OBSIDIAN_REST_DEFAULT_URL = "https://127.0.0.1:27124"
SUPPORTED_EXTENSIONS = {".md"}
IGNORE_DIRS = {".obsidian", ".trash", ".git", "node_modules"}

# Accounting-relevant tags for smart prioritization
ACCOUNTING_TAGS = {
    "contabilidade", "fiscal", "tributario", "tributário", "imposto",
    "icms", "pis", "cofins", "irpj", "csll", "simples", "lucro-real",
    "lucro-presumido", "cpc", "nbc", "ctn", "clt", "esocial", "sped",
    "ecd", "ecf", "fap", "rat", "inss", "fgts", "mei", "receita-federal",
    "auditoria", "balanco", "balanço", "dre", "fluxo-caixa",
    "obrigacao-acessoria", "obrigação-acessória", "nota-fiscal",
    "legislacao", "legislação", "parecer", "consultoria",
}


class ObsidianNote:
    """Represents a parsed Obsidian note with metadata."""

    def __init__(self, path: str, content: str, vault_name: str = ""):
        self.path = path
        self.content = content
        self.vault_name = vault_name
        self.title = Path(path).stem
        self.frontmatter: dict = {}
        self.body: str = ""
        self.tags: set[str] = set()
        self.wikilinks: list[str] = []
        self.content_hash: str = ""
        self._parse()

    def _parse(self):
        """Parse frontmatter, body, tags, and wikilinks from the note."""
        self.content_hash = hashlib.sha256(self.content.encode("utf-8")).hexdigest()[:16]

        # Extract YAML frontmatter
        fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n", self.content, re.DOTALL)
        if fm_match:
            try:
                self.frontmatter = yaml.safe_load(fm_match.group(1)) or {}
            except yaml.YAMLError:
                self.frontmatter = {}
            self.body = self.content[fm_match.end():]
        else:
            self.body = self.content

        # Extract tags from frontmatter
        fm_tags = self.frontmatter.get("tags", [])
        if isinstance(fm_tags, str):
            fm_tags = [t.strip() for t in fm_tags.split(",")]
        elif isinstance(fm_tags, list):
            fm_tags = [str(t).strip() for t in fm_tags]
        self.tags.update(fm_tags)

        # Extract inline #tags from body
        inline_tags = re.findall(r"(?:^|\s)#([a-zA-ZÀ-ú0-9_/-]+)", self.body)
        self.tags.update(inline_tags)

        # Extract [[wikilinks]]
        self.wikilinks = re.findall(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]", self.body)

    @property
    def is_accounting_relevant(self) -> bool:
        """Check if note has accounting-relevant tags or keywords."""
        # Check tags
        normalized_tags = {t.lower().replace(" ", "-") for t in self.tags}
        if normalized_tags & ACCOUNTING_TAGS:
            return True
        # Check title and content for accounting keywords
        combined = (self.title + " " + self.body[:500]).lower()
        return any(kw in combined for kw in ACCOUNTING_TAGS)

    @property
    def priority_score(self) -> int:
        """Calculate ingestion priority (higher = more relevant)."""
        score = 0
        normalized_tags = {t.lower().replace(" ", "-") for t in self.tags}
        score += len(normalized_tags & ACCOUNTING_TAGS) * 10
        # Frontmatter boost
        if self.frontmatter.get("tipo") in ["parecer", "legislacao", "procedimento", "modelo"]:
            score += 20
        if self.frontmatter.get("status") == "revisado":
            score += 5
        # Length matters — longer notes likely have more substance
        score += min(len(self.body) // 500, 10)
        return score


class ObsidianService:
    """
    Service to integrate Obsidian vaults with the Copiloto Contábil knowledge base.
    """

    def __init__(self):
        self.settings = get_settings()

    # ─── Mode 1: Local REST API ──────────────────────────────────────────

    async def fetch_notes_via_api(
        self,
        api_url: str = OBSIDIAN_REST_DEFAULT_URL,
        api_key: str = "",
        folder_filter: str = "",
    ) -> list[ObsidianNote]:
        """
        Fetch notes from Obsidian using the Local REST API plugin.

        Args:
            api_url: Base URL of the Obsidian REST API (default: https://127.0.0.1:27124)
            api_key: Bearer token from the plugin settings
            folder_filter: Optional folder path to restrict sync (e.g. "Contabilidade/")
        """
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
        }

        notes: list[ObsidianNote] = []

        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            # List all files in the vault
            try:
                resp = await client.get(f"{api_url}/vault/", headers=headers)
                resp.raise_for_status()
                file_list = resp.json().get("files", [])
            except Exception as e:
                logger.error(f"Failed to list Obsidian vault files: {e}")
                raise ValueError(f"Não foi possível conectar ao Obsidian REST API: {e}")

            # Filter markdown files
            md_files = [
                f for f in file_list
                if f.endswith(".md")
                and not any(ig in f for ig in IGNORE_DIRS)
                and (not folder_filter or f.startswith(folder_filter))
            ]

            logger.info(f"Obsidian API: Found {len(md_files)} markdown files")

            # Fetch content for each file
            for file_path in md_files:
                try:
                    resp = await client.get(
                        f"{api_url}/vault/{file_path}",
                        headers={**headers, "Accept": "text/markdown"},
                    )
                    resp.raise_for_status()
                    content = resp.text
                    if content.strip():
                        notes.append(ObsidianNote(
                            path=file_path,
                            content=content,
                            vault_name="obsidian-api",
                        ))
                except Exception as e:
                    logger.warning(f"Failed to fetch note '{file_path}': {e}")
                    continue

        logger.info(f"Obsidian API: Successfully parsed {len(notes)} notes")
        return notes

    # ─── Mode 2: Direct Filesystem ───────────────────────────────────────

    def scan_vault_directory(
        self,
        vault_path: str,
        folder_filter: str = "",
    ) -> list[ObsidianNote]:
        """
        Scan a local Obsidian vault directory and parse all markdown files.

        Args:
            vault_path: Absolute path to the Obsidian vault root
            folder_filter: Optional subfolder to restrict scan
        """
        vault = Path(vault_path.strip().strip('"').strip("'"))
        if not vault.exists() or not vault.is_dir():
            raise ValueError(f"Caminho do vault inválido: {vault_path}")

        search_root = vault / folder_filter if folder_filter else vault
        if not search_root.exists():
            raise ValueError(f"Pasta não encontrada no vault: {folder_filter}")

        notes: list[ObsidianNote] = []

        for md_file in search_root.rglob("*.md"):
            # Skip hidden/ignored directories
            parts = md_file.relative_to(vault).parts
            if any(p in IGNORE_DIRS for p in parts):
                continue

            try:
                content = md_file.read_text(encoding="utf-8")
                if content.strip():
                    rel_path = str(md_file.relative_to(vault)).replace("\\", "/")
                    notes.append(ObsidianNote(
                        path=rel_path,
                        content=content,
                        vault_name=vault.name,
                    ))
            except Exception as e:
                logger.warning(f"Failed to read '{md_file}': {e}")
                continue

        logger.info(f"Vault scan: Found {len(notes)} notes in '{vault_path}'")
        return notes

    # ─── Structure-Aware Markdown Chunking ────────────────────────────────

    def chunk_note(
        self,
        note: ObsidianNote,
        max_chunk_size: int = 1200,
        chunk_overlap: int = 150,
    ) -> list[dict]:
        """
        Split a note into semantically meaningful chunks, preserving header hierarchy.

        Each chunk includes:
          - content: the text
          - metadata: source path, section heading, tags, frontmatter context
        """
        body = note.body.strip()
        if not body:
            return []

        # Clean wikilinks for plain text: [[Target|Display]] → Display, [[Target]] → Target
        body = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"\2", body)
        body = re.sub(r"\[\[([^\]]+)\]\]", r"\1", body)

        # Split by headers (preserve header text for context)
        sections = self._split_by_headers(body)
        chunks = []

        for section_heading, section_text in sections:
            if not section_text.strip():
                continue

            # Prepend context to each chunk
            context_prefix = f"Nota: {note.title}"
            if section_heading:
                context_prefix += f" > {section_heading}"
            if note.tags:
                context_prefix += f" | Tags: {', '.join(sorted(note.tags)[:5])}"
            context_prefix += "\n\n"

            # If section fits in one chunk, keep it whole
            full_content = context_prefix + section_text.strip()
            if len(full_content) <= max_chunk_size:
                chunks.append(self._make_chunk(note, full_content, section_heading, len(chunks)))
            else:
                # Sub-split large sections by paragraphs
                paragraphs = re.split(r"\n\s*\n", section_text)
                current_chunk = context_prefix
                for para in paragraphs:
                    para = para.strip()
                    if not para:
                        continue
                    if len(current_chunk) + len(para) + 2 > max_chunk_size and len(current_chunk) > len(context_prefix):
                        chunks.append(self._make_chunk(note, current_chunk.strip(), section_heading, len(chunks)))
                        # Start new chunk with overlap
                        overlap_text = current_chunk[-chunk_overlap:] if len(current_chunk) > chunk_overlap else ""
                        current_chunk = context_prefix + overlap_text + "\n\n" + para
                    else:
                        current_chunk += "\n\n" + para

                if current_chunk.strip() and len(current_chunk) > len(context_prefix):
                    chunks.append(self._make_chunk(note, current_chunk.strip(), section_heading, len(chunks)))

        return chunks

    def _split_by_headers(self, text: str) -> list[tuple[str, str]]:
        """Split markdown text by headers, returning (heading, content) tuples."""
        # Regex to match markdown headers
        header_pattern = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)

        sections = []
        last_end = 0
        last_heading = ""

        for match in header_pattern.finditer(text):
            # Content before this header belongs to the previous section
            if match.start() > last_end:
                content = text[last_end:match.start()]
                if content.strip():
                    sections.append((last_heading, content))

            last_heading = match.group(2).strip()
            last_end = match.end()

        # Remaining content after the last header
        if last_end < len(text):
            remaining = text[last_end:]
            if remaining.strip():
                sections.append((last_heading, remaining))

        # If no headers found, return the whole text as a single section
        if not sections and text.strip():
            sections.append(("", text))

        return sections

    def _make_chunk(self, note: ObsidianNote, content: str, heading: str, index: int) -> dict:
        """Create a chunk dict with full metadata for embedding."""
        return {
            "content": content,
            "metadata": {
                "source": f"obsidian://{note.vault_name}/{note.path}",
                "source_type": "obsidian",
                "note_title": note.title,
                "section": heading,
                "vault": note.vault_name,
                "path": note.path,
                "tags": list(note.tags)[:10],
                "frontmatter_tipo": note.frontmatter.get("tipo", ""),
                "frontmatter_area": note.frontmatter.get("area", ""),
                "chunk_index": index,
                "content_hash": note.content_hash,
                "priority": note.priority_score,
                "ingested_at": datetime.now(timezone.utc).isoformat(),
            },
        }

    # ─── Embedding & Ingestion Pipeline ──────────────────────────────────

    async def ingest_notes(
        self,
        notes: list[ObsidianNote],
        organization_id: str,
        uploaded_by: str,
        sync_id: Optional[str] = None,
        smart_filter: bool = True,
    ) -> dict:
        """
        Process parsed notes through the embedding pipeline and store in pgvector.

        Args:
            notes: List of parsed ObsidianNote objects
            organization_id: Organization ID for multi-tenant isolation
            uploaded_by: User ID who triggered the sync
            sync_id: Optional sync session ID for tracking
            smart_filter: If True, prioritize accounting-relevant notes

        Returns:
            Summary dict with ingestion statistics
        """
        settings = get_settings()
        if not settings.openai_api_key:
            raise ValueError("OpenAI API key não configurada. Embeddings indisponíveis.")

        supabase = get_admin_singleton()
        sync_id = sync_id or str(uuid.uuid4())

        # Filter and sort by relevance
        if smart_filter:
            # Always include accounting-relevant notes; include others only if they have substance
            relevant = [n for n in notes if n.is_accounting_relevant]
            others = [n for n in notes if not n.is_accounting_relevant and len(n.body) > 200]
            notes = sorted(relevant, key=lambda n: n.priority_score, reverse=True) + others
            logger.info(f"Smart filter: {len(relevant)} relevant, {len(others)} additional")

        # Check for existing hashes to avoid re-processing unchanged notes
        existing_hashes = set()
        try:
            existing = supabase.table("knowledge_chunks") \
                .select("metadata") \
                .eq("organization_id", organization_id) \
                .like("metadata->>source_type", "obsidian") \
                .execute()
            for row in (existing.data or []):
                meta = row.get("metadata", {})
                if isinstance(meta, dict):
                    h = meta.get("content_hash", "")
                    if h:
                        existing_hashes.add(h)
        except Exception as e:
            logger.warning(f"Could not check existing hashes: {e}")

        # Chunk all notes
        all_chunks = []
        skipped_unchanged = 0
        for note in notes:
            if note.content_hash in existing_hashes:
                skipped_unchanged += 1
                continue
            chunks = self.chunk_note(note)
            all_chunks.extend(chunks)

        if not all_chunks:
            return {
                "sync_id": sync_id,
                "status": "no_changes",
                "notes_scanned": len(notes),
                "notes_skipped_unchanged": skipped_unchanged,
                "chunks_created": 0,
                "message": "Nenhuma nota nova ou modificada encontrada.",
            }

        # Generate embeddings in batches
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)

        chunks_to_insert = []
        batch_size = 20

        for batch_start in range(0, len(all_chunks), batch_size):
            batch = all_chunks[batch_start:batch_start + batch_size]
            texts = [c["content"] for c in batch]

            try:
                embedding_response = client.embeddings.create(
                    model="text-embedding-3-small",
                    input=texts,
                )
            except Exception as e:
                logger.error(f"Embedding batch failed: {e}")
                continue

            for j, emb_data in enumerate(embedding_response.data):
                chunk = batch[j]
                chunk_meta = chunk["metadata"]
                chunk_meta["sync_id"] = sync_id

                chunks_to_insert.append({
                    "organization_id": organization_id,
                    "document_id": sync_id,  # Group under sync session
                    "document_name": f"Obsidian: {chunk_meta.get('note_title', 'nota')}",
                    "content": chunk["content"],
                    "embedding": emb_data.embedding,
                    "metadata": chunk_meta,
                })

        # Insert into pgvector
        if chunks_to_insert:
            # Insert in smaller batches to avoid payload limits
            insert_batch_size = 50
            for i in range(0, len(chunks_to_insert), insert_batch_size):
                batch = chunks_to_insert[i:i + insert_batch_size]
                try:
                    supabase.table("knowledge_chunks").insert(batch).execute()
                except Exception as e:
                    logger.error(f"Insert batch failed: {e}")

        # Register the sync as a document entry for visibility in KnowledgeAdmin
        try:
            supabase.table("documents").insert({
                "id": sync_id,
                "organization_id": organization_id,
                "uploaded_by": uploaded_by,
                "file_name": f"🗃️ Obsidian Sync ({datetime.now().strftime('%d/%m/%Y %H:%M')})",
                "file_type": "obsidian/vault",
                "file_size": sum(len(c["content"].encode()) for c in chunks_to_insert),
                "storage_path": f"obsidian/{organization_id}/{sync_id}",
                "analysis_status": "completed",
            }).execute()
        except Exception as e:
            logger.warning(f"Could not register sync document: {e}")

        total_chunks = len(chunks_to_insert)
        unique_notes = len({c["metadata"]["path"] for c in all_chunks})

        logger.info(
            f"Obsidian sync complete: {unique_notes} notes → {total_chunks} chunks "
            f"(skipped {skipped_unchanged} unchanged)"
        )

        return {
            "sync_id": sync_id,
            "status": "success",
            "notes_scanned": len(notes),
            "notes_ingested": unique_notes,
            "notes_skipped_unchanged": skipped_unchanged,
            "chunks_created": total_chunks,
            "message": f"Sincronização concluída: {unique_notes} notas → {total_chunks} fragmentos indexados.",
        }

    # ─── Sync Status & Management ────────────────────────────────────────

    async def get_sync_history(self, organization_id: str) -> list[dict]:
        """Get history of Obsidian sync sessions for the organization."""
        supabase = get_admin_singleton()
        result = supabase.table("documents") \
            .select("id, file_name, file_size, analysis_status, created_at") \
            .eq("organization_id", organization_id) \
            .eq("file_type", "obsidian/vault") \
            .order("created_at", desc=True) \
            .limit(20) \
            .execute()

        syncs = []
        for doc in (result.data or []):
            # Count chunks for this sync
            chunks = supabase.table("knowledge_chunks") \
                .select("id", count="exact") \
                .eq("document_id", doc["id"]) \
                .execute()

            syncs.append({
                **doc,
                "chunks_count": chunks.count if hasattr(chunks, 'count') and chunks.count else len(chunks.data or []),
            })

        return syncs

    async def delete_sync(self, sync_id: str, organization_id: str) -> dict:
        """Delete a specific sync session and all its chunks."""
        supabase = get_admin_singleton()

        # Delete chunks
        supabase.table("knowledge_chunks").delete() \
            .eq("document_id", sync_id) \
            .eq("organization_id", organization_id) \
            .execute()

        # Delete document record
        supabase.table("documents").delete() \
            .eq("id", sync_id) \
            .eq("organization_id", organization_id) \
            .execute()

        return {"status": "deleted", "sync_id": sync_id}


# ── Singleton ────────────────────────────────────────────────────────────────
_obsidian_service: Optional[ObsidianService] = None


def get_obsidian_service() -> ObsidianService:
    """Returns a cached singleton of the Obsidian service."""
    global _obsidian_service
    if _obsidian_service is None:
        _obsidian_service = ObsidianService()
    return _obsidian_service
