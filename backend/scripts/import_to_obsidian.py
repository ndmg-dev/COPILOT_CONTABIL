"""
Copiloto Contábil IA — PDF-to-Obsidian Importer
Converte PDFs de uma pasta em notas Markdown no vault Obsidian,
com frontmatter YAML automático e organização por tipo.

Uso:
    python import_to_obsidian.py --source "C:/MeusPDFs" --vault "C:/ObsidianVault"
    python import_to_obsidian.py --source "C:/MeusPDFs" --vault "C:/ObsidianVault" --pasta Legislacao
"""
import os
import re
import sys
import argparse
from pathlib import Path
from datetime import datetime

def extract_text_from_pdf(pdf_path: str) -> tuple[str, int]:
    """Extract text from a PDF file. Returns (text, page_count)."""
    from pypdf import PdfReader
    reader = PdfReader(pdf_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text and text.strip():
            pages.append(f"<!-- Página {i+1} -->\n{text.strip()}")
    return "\n\n---\n\n".join(pages), len(reader.pages)


def extract_text_from_docx(docx_path: str) -> str:
    """Extract text from a DOCX file."""
    from docx import Document
    doc = Document(docx_path)
    paragraphs = []
    for para in doc.paragraphs:
        if para.text.strip():
            # Preserve heading styles as markdown headers
            if para.style and para.style.name.startswith("Heading"):
                level = para.style.name.replace("Heading ", "")
                try:
                    level = int(level)
                except ValueError:
                    level = 2
                paragraphs.append(f"{'#' * level} {para.text.strip()}")
            else:
                paragraphs.append(para.text.strip())
    return "\n\n".join(paragraphs)


def guess_tags(text: str, filename: str) -> list[str]:
    """Auto-detect accounting tags from content."""
    combined = (filename + " " + text[:2000]).lower()
    tag_map = {
        "icms": "icms", "pis": "pis", "cofins": "cofins",
        "irpj": "irpj", "csll": "csll", "simples nacional": "simples-nacional",
        "lucro real": "lucro-real", "lucro presumido": "lucro-presumido",
        "cpc": "cpc", "nbc": "nbc", "ctn": "ctn", "clt": "clt",
        "esocial": "esocial", "sped": "sped", "ecd": "ecd", "ecf": "ecf",
        "fap": "fap", "rat": "rat", "inss": "inss", "fgts": "fgts",
        "mei": "mei", "iss": "iss", "ipi": "ipi",
        "receita federal": "receita-federal", "nota fiscal": "nota-fiscal",
        "contrato social": "societario", "balanço": "balanco",
        "dre": "dre", "auditoria": "auditoria",
        "trabalhist": "trabalhista", "tributár": "tributario",
        "previdenciár": "previdenciario", "contábil": "contabil",
        "fiscal": "fiscal",
    }
    found = []
    for keyword, tag in tag_map.items():
        if keyword in combined and tag not in found:
            found.append(tag)
    return found[:8] or ["geral"]


def guess_tipo(filename: str, tags: list[str]) -> str:
    """Guess the document tipo from filename and tags."""
    fname = filename.lower()
    if any(w in fname for w in ["parecer", "opinião", "consulta"]):
        return "parecer"
    if any(w in fname for w in ["lei", "decreto", "resolução", "instrução", "norma", "cpc", "nbc"]):
        return "legislacao"
    if any(w in fname for w in ["procedimento", "manual", "checklist", "roteiro"]):
        return "procedimento"
    if any(w in fname for w in ["modelo", "template", "minuta"]):
        return "modelo"
    return "referencia"


def guess_area(tags: list[str]) -> str:
    """Guess the area from tags."""
    if any(t in tags for t in ["trabalhista", "esocial", "fgts", "inss", "clt", "fap", "rat"]):
        return "trabalhista"
    if any(t in tags for t in ["tributario", "icms", "pis", "cofins", "irpj", "csll", "simples-nacional", "fiscal"]):
        return "tributario"
    if any(t in tags for t in ["societario"]):
        return "societario"
    return "contabil"


def sanitize_filename(name: str) -> str:
    """Remove characters not allowed in filenames."""
    name = re.sub(r'[<>:"/\\|?*]', '-', name)
    name = re.sub(r'\s+', '-', name.strip())
    name = re.sub(r'-+', '-', name)
    return name[:100]


def convert_file_to_note(file_path: Path, vault_path: Path, target_folder: str = "") -> dict:
    """
    Convert a document to an Obsidian markdown note.
    
    Returns a dict with status info.
    """
    ext = file_path.suffix.lower()
    filename_stem = file_path.stem
    
    # Extract text based on file type
    try:
        if ext == ".pdf":
            text, page_count = extract_text_from_pdf(str(file_path))
            extra_info = f"Páginas: {page_count}"
        elif ext == ".docx":
            text = extract_text_from_docx(str(file_path))
            page_count = 0
            extra_info = f"Tipo: DOCX"
        elif ext == ".txt" or ext == ".md":
            text = file_path.read_text(encoding="utf-8", errors="replace")
            page_count = 0
            extra_info = "Tipo: Texto"
        else:
            return {"file": file_path.name, "status": "skipped", "reason": f"Formato não suportado: {ext}"}
    except Exception as e:
        return {"file": file_path.name, "status": "error", "reason": str(e)}
    
    if not text or len(text.strip()) < 50:
        return {"file": file_path.name, "status": "skipped", "reason": "Sem texto extraível (PDF escaneado?)"}
    
    # Auto-detect metadata
    tags = guess_tags(text, filename_stem)
    tipo = guess_tipo(filename_stem, tags)
    area = guess_area(tags)
    
    # Determine target folder
    folder_map = {
        "legislacao": "Legislacao",
        "parecer": "Pareceres",
        "procedimento": "Procedimentos",
        "modelo": "Modelos",
        "referencia": "Referencia",
    }
    folder_name = target_folder or folder_map.get(tipo, "Importados")
    
    # Build the markdown note
    safe_name = sanitize_filename(filename_stem)
    tags_yaml = ", ".join(tags)
    
    frontmatter = f"""---
tags: [{tags_yaml}]
tipo: {tipo}
area: {area}
status: importado
fonte: {file_path.name}
data_importacao: {datetime.now().strftime('%Y-%m-%d')}
---"""

    # Add a title header
    title = filename_stem.replace("-", " ").replace("_", " ")
    
    note_content = f"""{frontmatter}

# {title}

> 📄 **Documento importado automaticamente** de `{file_path.name}` | {extra_info}

{text}
"""
    
    # Write to vault
    target_dir = vault_path / folder_name
    target_dir.mkdir(parents=True, exist_ok=True)
    
    note_path = target_dir / f"{safe_name}.md"
    
    # Avoid overwriting — add suffix if exists
    counter = 1
    while note_path.exists():
        note_path = target_dir / f"{safe_name}-{counter}.md"
        counter += 1
    
    note_path.write_text(note_content, encoding="utf-8")
    
    return {
        "file": file_path.name,
        "status": "ok",
        "note": str(note_path.relative_to(vault_path)),
        "tags": tags,
        "tipo": tipo,
        "chars": len(text),
    }


def main():
    parser = argparse.ArgumentParser(
        description="Importa PDFs/DOCX para o Obsidian Vault como notas Markdown"
    )
    parser.add_argument("--source", "-s", required=True, help="Pasta com os documentos (PDF, DOCX, TXT)")
    parser.add_argument("--vault", "-v", required=True, help="Caminho do Obsidian Vault")
    parser.add_argument("--pasta", "-p", default="", help="Pasta destino dentro do vault (ex: Legislacao)")
    args = parser.parse_args()

    source = Path(args.source)
    vault = Path(args.vault)

    if not source.exists():
        print(f"❌ Pasta de origem não encontrada: {source}")
        sys.exit(1)
    if not vault.exists():
        print(f"❌ Vault não encontrado: {vault}")
        sys.exit(1)

    # Find all supported files
    extensions = {".pdf", ".docx", ".txt", ".md"}
    files = [f for f in source.iterdir() if f.is_file() and f.suffix.lower() in extensions]
    
    if not files:
        print(f"⚠️ Nenhum documento encontrado em: {source}")
        sys.exit(0)

    print(f"\n🗃️ Importando {len(files)} documentos para o vault: {vault}")
    print(f"{'─' * 60}")

    results = {"ok": 0, "skipped": 0, "error": 0}

    for file_path in sorted(files):
        result = convert_file_to_note(file_path, vault, args.pasta)
        status = result["status"]
        results[status] = results.get(status, 0) + 1

        if status == "ok":
            tags_str = ", ".join(result.get("tags", []))
            print(f"  ✅ {result['file']}")
            print(f"     → {result['note']} [{result['tipo']}] tags: {tags_str}")
        elif status == "skipped":
            print(f"  ⏭️ {result['file']} — {result.get('reason', '')}")
        else:
            print(f"  ❌ {result['file']} — {result.get('reason', '')}")

    print(f"\n{'─' * 60}")
    print(f"📊 Resultado: {results['ok']} importados | {results['skipped']} ignorados | {results['error']} erros")
    print(f"\n💡 Agora sincronize o vault no Copilot Contábil: /app/obsidian → Sincronizar Vault")


if __name__ == "__main__":
    main()
