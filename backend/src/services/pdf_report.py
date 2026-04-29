from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas


def _safe(value, fallback: str = "-") -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    return text if text else fallback


def render_evento_pdf(evento, logo_path: Path | None = None) -> BytesIO:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    logo = Path(logo_path) if logo_path else (Path(__file__).parents[3] / "frontend/public/IanorthLog.png")

    pdf.setFillColor(colors.HexColor("#1e3a8a"))
    pdf.rect(0, 0, width, height, stroke=0, fill=1)
    pdf.setFillColor(colors.HexColor("#3b82f6"))
    pdf.rect(0, height - 1.5 * cm, width, 1.5 * cm, stroke=0, fill=1)

    if logo.exists():
        pdf.drawImage(str(logo), 2 * cm, height - 4.6 * cm, width=7 * cm, preserveAspectRatio=True, mask="auto")

    pdf.setFillColor(colors.white)
    pdf.setFont("Helvetica-Bold", 22)
    pdf.drawString(2 * cm, height - 6.2 * cm, "Relatório de Ticket")
    pdf.setFont("Helvetica", 12)
    pdf.drawString(2 * cm, height - 7.1 * cm, "Sistema IANorth - Cubagem e Classificação")

    y = height - 8.8 * cm
    pdf.setFillColor(colors.HexColor("#bfdbfe"))
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(2 * cm, y, "Dados do evento")
    y -= 0.8 * cm
    pdf.setFillColor(colors.white)
    pdf.setFont("Helvetica", 11)

    peso_bruto = float(getattr(evento, "peso_balanca", 0) or 0)
    peso_tara = float(getattr(evento, "peso_tara", 0) or 0)
    peso_liquido = getattr(evento, "peso_liquido", None)
    if peso_liquido is None:
        peso_liquido = max(0.0, peso_bruto - peso_tara)

    linhas = [
        f"ID: {_safe(getattr(evento, 'id', None))}",
        f"Ticket: {_safe(getattr(evento, 'ticket_id', None))}",
        f"Placa: {_safe(getattr(evento, 'placa_veiculo', None))}",
        f"Status: {_safe(getattr(evento, 'status_ticket', None))}",
        f"Fornecedor: {_safe(getattr(evento, 'fornecedor_nome', None))}",
        f"Produto: {_safe(getattr(evento, 'produto_declarado', None))}",
        f"Tipo sucata: {_safe(getattr(evento, 'tipo_sucata', None))}",
        f"Cubagem (m³): {_safe(getattr(evento, 'cubagem_m3', None))}",
        f"Peso bruto (kg): {peso_bruto:.0f}",
        f"Peso líquido (kg): {float(peso_liquido or 0):.0f}",
        f"Densidade: {_safe(getattr(evento, 'densidade', None))}",
        f"Data registro: {_safe(getattr(evento, 'timestamp_registro', None))}",
    ]
    for linha in linhas:
        pdf.drawString(2 * cm, y, linha)
        y -= 0.6 * cm

    observacao = _safe(getattr(evento, "observacao", None), "Sem observações")
    pdf.setFillColor(colors.HexColor("#bfdbfe"))
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(2 * cm, y - 0.4 * cm, "Observações")
    y -= 1.1 * cm
    pdf.setFillColor(colors.white)
    pdf.setFont("Helvetica", 10)
    texto = pdf.beginText(2 * cm, y)
    for linha in observacao.splitlines() or ["Sem observações"]:
        texto.textLine(linha[:110])
    pdf.drawText(texto)

    pdf.setStrokeColor(colors.HexColor("#93c5fd"))
    pdf.line(2 * cm, 2 * cm, width - 2 * cm, 2 * cm)
    pdf.setFillColor(colors.HexColor("#bfdbfe"))
    pdf.setFont("Helvetica", 9)
    pdf.drawString(2 * cm, 1.5 * cm, "IANorth Tecnologia")

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer
