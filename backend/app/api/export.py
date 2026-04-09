"""
Copiloto Contábil IA — PDF Export API (Parecer Técnico)
Generates white-label PDF technical opinions using ReportLab.
Structure: Header (Logo + Date) → Title → Query → Technical Response → Legal Foundation → Footer
"""
import io
import re
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, Color
import httpx
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, Frame, PageTemplate, Image
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from app.models.schemas import PDFExportRequest, UserProfile
from app.middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/export", tags=["Export"])


# ─── Color Palette (Corporate) ──────────────────────────────────────────────
DARK_NAVY = HexColor("#0F172A")
SLATE_700 = HexColor("#334155")
SLATE_500 = HexColor("#64748B")
SLATE_400 = HexColor("#94A3B8")
TEAL = HexColor("#0D9488")
TEAL_LIGHT = HexColor("#CCFBF1")
INDIGO = HexColor("#4F46E5")
INDIGO_LIGHT = HexColor("#E0E7FF")
BORDER_GRAY = HexColor("#E2E8F0")
BG_LIGHT = HexColor("#F8FAFC")
WHITE = HexColor("#FFFFFF")


# ─── Logo Downloader ────────────────────────────────────────────────────────
def _download_logo(url: str) -> io.BytesIO | None:
    try:
        if not url: return None
        with httpx.Client(timeout=3.0) as client:
            res = client.get(url)
            if res.status_code == 200:
                return io.BytesIO(res.content)
    except Exception as e:
        logger.warning(f"Failed to download logo from {url}: {e}")
    return None

# ─── Legal Reference Extraction ─────────────────────────────────────────────
def _extract_legal_references(text: str) -> list[str]:
    """Extract legal references from AI response text."""
    patterns = [
        r'(?:Art(?:igo)?\.?\s*\d+[^.]*(?:Lei|LC|CF|CTN|CPC|NBC|IN|RFB|RICMS|CLT)[^.]*\.)',
        r'(?:Lei\s+(?:n[°ºo]\.?\s*)?\d[\d./]+[^.]*\.)',
        r'(?:NBC\s+T[GA]?\s*\d+[^.]*\.)',
        r'(?:CPC\s+\d+[^.]*\.)',
        r'(?:IN\s+(?:RFB|SRF)\s+(?:n[°ºo]\.?\s*)?\d[\d./]+[^.]*\.)',
        r'(?:Decreto\s+(?:n[°ºo]\.?\s*)?\d[\d./]+[^.]*\.)',
        r'(?:Instrução\s+Normativa[^.]*\.)',
        r'(?:Resolução\s+(?:CFC|CVM|CGSN)\s+(?:n[°ºo]\.?\s*)?\d[\d./]+[^.]*\.)',
    ]

    refs = set()
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for m in matches:
            cleaned = m.strip()
            if len(cleaned) > 15:
                refs.add(cleaned)

    return sorted(refs)


# ─── PDF Builder ─────────────────────────────────────────────────────────────
def _build_parecer_pdf(
    content: str,
    query: str | None,
    title: str,
    org_name: str,
    include_logo: bool,
    isolate_legal: bool,
    logo_url: str | None = None,
) -> io.BytesIO:
    """Build a structured Parecer Técnico PDF."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=22 * mm,
        rightMargin=22 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    page_width = A4[0] - 44 * mm
    styles = getSampleStyleSheet()

    # ── Custom Styles ────────────────────────────────────────────────────
    styles.add(ParagraphStyle(
        name="OrgName", fontSize=14, textColor=DARK_NAVY,
        fontName="Helvetica-Bold", spaceAfter=2, alignment=TA_LEFT,
    ))
    styles.add(ParagraphStyle(
        name="DateStamp", fontSize=8, textColor=SLATE_500,
        fontName="Helvetica", spaceBefore=0, spaceAfter=0, alignment=TA_RIGHT,
    ))
    styles.add(ParagraphStyle(
        name="DocTitle", fontSize=16, textColor=DARK_NAVY,
        fontName="Helvetica-Bold", spaceBefore=16, spaceAfter=6, alignment=TA_LEFT,
    ))
    styles.add(ParagraphStyle(
        name="SectionLabel", fontSize=9, textColor=TEAL,
        fontName="Helvetica-Bold", spaceBefore=16, spaceAfter=6,
        alignment=TA_LEFT, leading=12,
    ))
    styles.add(ParagraphStyle(
        name="BodyText2", fontSize=10, textColor=SLATE_700,
        fontName="Helvetica", spaceAfter=6, alignment=TA_JUSTIFY,
        leading=15, leftIndent=0,
    ))
    styles.add(ParagraphStyle(
        name="QueryText", fontSize=10, textColor=DARK_NAVY,
        fontName="Helvetica-Oblique", spaceAfter=4, alignment=TA_LEFT,
        leading=14, leftIndent=8, rightIndent=8,
    ))
    styles.add(ParagraphStyle(
        name="LegalRef", fontSize=9, textColor=HexColor("#1E3A5F"),
        fontName="Courier", spaceAfter=3, alignment=TA_LEFT,
        leading=12, leftIndent=6,
    ))
    styles.add(ParagraphStyle(
        name="FooterText", fontSize=7, textColor=SLATE_400,
        fontName="Helvetica", alignment=TA_CENTER, spaceAfter=0,
    ))
    styles.add(ParagraphStyle(
        name="Disclaimer", fontSize=7, textColor=SLATE_400,
        fontName="Helvetica-Oblique", alignment=TA_CENTER, spaceBefore=6,
    ))

    elements = []

    # ═══════════════════════════════════════════════════════════════════════
    # HEADER — Organization + Date
    # ═══════════════════════════════════════════════════════════════════════
    date_str = datetime.now().strftime("%d/%m/%Y às %H:%M")

    if include_logo:
        header_left = []
        if logo_url:
            logo_buffer = _download_logo(logo_url)
            if logo_buffer:
                try:
                    img = Image(logo_buffer)
                    # Limit width and height
                    img.drawWidth = 40 * mm
                    img.drawHeight = 20 * mm
                    # Keep aspect ratio
                    img.preserveAspectRatio = True
                    header_left.append(img)
                except Exception as e:
                    logger.warning(f"Failed to process logo image: {e}")
                    header_left.append(Paragraph(org_name, styles["OrgName"]))
            else:
                header_left.append(Paragraph(org_name, styles["OrgName"]))
        else:
            header_left.append(Paragraph(org_name, styles["OrgName"]))
        
        # Header table with org name/logo left, date right
        header_data = [[
            header_left,
            Paragraph(f"Documento gerado em: {date_str}", styles["DateStamp"]),
        ]]
        header_table = Table(header_data, colWidths=[page_width * 0.6, page_width * 0.4])
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (0, 0), (0, 0), "LEFT"),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(header_table)
    else:
        elements.append(Paragraph(f"Documento gerado em: {date_str}", styles["DateStamp"]))

    # Teal divider line
    elements.append(HRFlowable(
        width="100%", thickness=2, color=TEAL,
        spaceBefore=4, spaceAfter=12,
    ))

    # ═══════════════════════════════════════════════════════════════════════
    # TITLE
    # ═══════════════════════════════════════════════════════════════════════
    elements.append(Paragraph(title, styles["DocTitle"]))

    # Light gray subtitle line
    elements.append(HRFlowable(
        width="100%", thickness=0.5, color=BORDER_GRAY,
        spaceBefore=2, spaceAfter=12,
    ))

    # ═══════════════════════════════════════════════════════════════════════
    # SECTION: CONSULTA (Original Query)
    # ═══════════════════════════════════════════════════════════════════════
    if query:
        elements.append(Paragraph("CONSULTA", styles["SectionLabel"]))

        # Query in a shaded box
        query_escaped = query.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        query_cell = [[Paragraph(f'"{query_escaped}"', styles["QueryText"])]]
        query_table = Table(query_cell, colWidths=[page_width - 4 * mm])
        query_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
            ("BOX", (0, 0), (-1, -1), 0.5, BORDER_GRAY),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ]))
        elements.append(query_table)
        elements.append(Spacer(1, 8))

    # ═══════════════════════════════════════════════════════════════════════
    # SECTION: RESPOSTA TÉCNICA
    # ═══════════════════════════════════════════════════════════════════════
    elements.append(Paragraph("RESPOSTA TÉCNICA", styles["SectionLabel"]))

    # Process content: convert markdown-like formatting
    content_clean = content

    # If isolating legal refs, remove them from main body for the separate section
    legal_refs = []
    if isolate_legal:
        legal_refs = _extract_legal_references(content)

    # Split and format paragraphs
    paragraphs = content_clean.split("\n")
    for para in paragraphs:
        para = para.strip()
        if not para:
            elements.append(Spacer(1, 4))
            continue

        # Escape HTML entities for ReportLab
        safe = para.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

        # Bold: **text** → <b>text</b>
        safe = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', safe)
        # Inline code: `code` → <font face="Courier" color="#4F46E5">code</font>
        safe = re.sub(r'`([^`]+)`', r'<font face="Courier" color="#4F46E5" size="9">\1</font>', safe)

        # Section headers (### / ## / #)
        if safe.startswith("### ") or safe.startswith("#### "):
            header_text = re.sub(r'^#{3,4}\s+', '', safe)
            elements.append(Spacer(1, 6))
            elements.append(Paragraph(header_text, ParagraphStyle(
                name=f"H3_{id(safe)}", parent=styles["BodyText2"],
                fontSize=11, fontName="Helvetica-Bold", textColor=SLATE_700,
                spaceBefore=8, spaceAfter=4,
            )))
        elif safe.startswith("## "):
            header_text = safe[3:]
            elements.append(Spacer(1, 8))
            elements.append(Paragraph(header_text, ParagraphStyle(
                name=f"H2_{id(safe)}", parent=styles["BodyText2"],
                fontSize=12, fontName="Helvetica-Bold", textColor=DARK_NAVY,
                spaceBefore=10, spaceAfter=4,
            )))
        elif safe.startswith("# "):
            header_text = safe[2:]
            elements.append(Paragraph(header_text, ParagraphStyle(
                name=f"H1_{id(safe)}", parent=styles["BodyText2"],
                fontSize=13, fontName="Helvetica-Bold", textColor=DARK_NAVY,
                spaceBefore=12, spaceAfter=6,
            )))
        elif safe.startswith("- ") or safe.startswith("* "):
            bullet_text = safe[2:]
            elements.append(Paragraph(f"• {bullet_text}", ParagraphStyle(
                name=f"BL_{id(safe)}", parent=styles["BodyText2"],
                leftIndent=12, bulletIndent=4,
            )))
        elif safe.startswith("&gt; "):
            # Blockquote → legal citation style
            cite_text = safe[5:]
            cite_cell = [[Paragraph(cite_text, ParagraphStyle(
                name=f"CIT_{id(safe)}", parent=styles["BodyText2"],
                fontName="Helvetica-Oblique", textColor=HexColor("#1E3A5F"),
                leftIndent=4,
            ))]]
            cite_table = Table(cite_cell, colWidths=[page_width - 8 * mm])
            cite_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), INDIGO_LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#C7D2FE")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]))
            elements.append(cite_table)
            elements.append(Spacer(1, 4))
        else:
            elements.append(Paragraph(safe, styles["BodyText2"]))

    # ═══════════════════════════════════════════════════════════════════════
    # SECTION: FUNDAMENTAÇÃO LEGAL (isolated)
    # ═══════════════════════════════════════════════════════════════════════
    if isolate_legal and legal_refs:
        elements.append(Spacer(1, 12))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_GRAY, spaceBefore=8, spaceAfter=8))
        elements.append(Paragraph("FUNDAMENTAÇÃO LEGAL", styles["SectionLabel"]))

        # Each reference in a styled box
        ref_rows = []
        for ref in legal_refs:
            ref_safe = ref.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            ref_rows.append([Paragraph(f"▸ {ref_safe}", styles["LegalRef"])])

        if ref_rows:
            ref_table = Table(ref_rows, colWidths=[page_width - 4 * mm])
            ref_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F0F9FF")),
                ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#BAE6FD")),
                ("TOPPADDING", (0, 0), (0, 0), 8),
                ("BOTTOMPADDING", (0, -1), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [HexColor("#F0F9FF"), HexColor("#E0F2FE")]),
            ]))
            elements.append(ref_table)

    elif isolate_legal and not legal_refs:
        elements.append(Spacer(1, 12))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_GRAY, spaceBefore=8, spaceAfter=8))
        elements.append(Paragraph("FUNDAMENTAÇÃO LEGAL", styles["SectionLabel"]))
        elements.append(Paragraph(
            "Nenhuma referência legal específica foi identificada automaticamente na resposta. "
            "Consulte um profissional para validação técnica.",
            styles["BodyText2"],
        ))

    # ═══════════════════════════════════════════════════════════════════════
    # FOOTER
    # ═══════════════════════════════════════════════════════════════════════
    elements.append(Spacer(1, 24))
    elements.append(HRFlowable(width="100%", thickness=1, color=TEAL, spaceBefore=0, spaceAfter=8))

    footer_text = f"{org_name}"
    elements.append(Paragraph(footer_text, styles["FooterText"]))
    elements.append(Paragraph(
        "Documento gerado automaticamente pelo Copilot Contábil IA. "
        "Este parecer tem caráter consultivo e não substitui a responsabilidade técnica do contador.",
        styles["Disclaimer"],
    ))

    # Build
    doc.build(elements)
    buffer.seek(0)
    return buffer


# ─── API Route ───────────────────────────────────────────────────────────────
@router.post("/pdf")
async def export_pdf(
    request: PDFExportRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Gera um Parecer Técnico em PDF white-label.
    Estrutura: Cabeçalho → Consulta → Resposta → Fundamentação Legal → Rodapé.
    """
    try:
        # Fetch organization logo from db if not provided in request
        logo_url = request.logo_url
        if not logo_url and current_user.organization_id:
            from app.supabase_client import get_admin_singleton
            supabase = get_admin_singleton()
            org_res = supabase.table("organizations").select("logo_url").eq("id", current_user.organization_id).single().execute()
            if org_res.data and org_res.data.get("logo_url"):
                logo_url = org_res.data["logo_url"]

        org_name = request.organization_name or current_user.organization_name or "Escritório Contábil"

        pdf_buffer = _build_parecer_pdf(
            content=request.content,
            query=request.query,
            title=request.title,
            org_name=org_name,
            include_logo=request.include_logo,
            isolate_legal=request.isolate_legal,
            logo_url=logo_url,
        )

        filename = f"parecer_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )

    except Exception as e:
        logger.error(f"PDF export error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao gerar PDF: {str(e)}",
        )
