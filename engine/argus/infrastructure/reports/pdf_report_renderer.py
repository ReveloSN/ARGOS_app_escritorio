from collections.abc import Callable
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Flowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from argus.domain.report_document import ReportCell, ReportDocument, ReportSection, ReportTable

MARGIN = 18 * mm
FOOTER_Y = 10 * mm
FOOTER_SIZE = 8
DETAIL_COLOR = "#4F4B44"
DETAIL = colors.HexColor(DETAIL_COLOR)
RULE_COLOR = colors.HexColor("#CFCBC2")
HEADER_FILL = colors.HexColor("#F3F1EC")
SECTION_GAP = 6 * mm

STYLES = getSampleStyleSheet()
TITLE = ParagraphStyle("ArgusTitle", parent=STYLES["Title"], fontSize=16, leading=20, alignment=0)
SUBTITLE = ParagraphStyle("ArgusSubtitle", parent=STYLES["Normal"], fontSize=9, textColor=DETAIL)
HEADING = ParagraphStyle("ArgusHeading", parent=STYLES["Heading2"], fontSize=12, spaceAfter=4)
BODY = ParagraphStyle("ArgusBody", parent=STYLES["Normal"], fontSize=9.5, leading=13)
CELL = ParagraphStyle("ArgusCell", parent=BODY, fontSize=8.5, leading=11)
METRIC = ParagraphStyle("ArgusMetric", parent=BODY, fontSize=16, leading=19)


def _text(value: str) -> str:
    return escape(value)


def _cell(cell: ReportCell) -> Paragraph:
    detail = (
        f'<br/><font size="7.5" color="{DETAIL_COLOR}">{_text(cell.detail)}</font>'
        if cell.detail
        else ""
    )
    return Paragraph(f"{_text(cell.text)}{detail}", CELL)


def _table(table: ReportTable) -> Table:
    header = [Paragraph(f"<b>{_text(column)}</b>", CELL) for column in table.columns]
    data = [header, *([_cell(cell) for cell in row] for row in table.rows)]
    flowable = Table(data, repeatRows=1, hAlign="LEFT")
    flowable.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), HEADER_FILL),
                ("LINEBELOW", (0, 0), (-1, -1), 0.5, RULE_COLOR),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    return flowable


def _metrics(section: ReportSection) -> Table:
    row = [
        Paragraph(f"<b>{_text(m.value)}</b><br/><font size='8'>{_text(m.label)}</font>", METRIC)
        for m in section.metrics
    ]
    return Table([row], hAlign="LEFT")


def _section(section: ReportSection) -> list[Flowable]:
    flowables: list[Flowable] = [Paragraph(_text(section.heading), HEADING)]
    if section.metrics:
        flowables.append(_metrics(section))
    flowables.extend(Paragraph(_text(text), BODY) for text in section.paragraphs)
    if section.table is not None:
        flowables.append(_table(section.table))
    return [*flowables, Spacer(1, SECTION_GAP)]


def _header(document: ReportDocument) -> list[Flowable]:
    title = Paragraph(
        f"{_text(document.title)} <font size='9' color='{DETAIL_COLOR}'>· {_text(document.brand)}</font>",
        TITLE,
    )
    subtitles = [Paragraph(_text(line), SUBTITLE) for line in document.subtitles]
    return [title, *subtitles, Spacer(1, SECTION_GAP)]


type PageCallback = Callable[[Canvas, SimpleDocTemplate], None]


def _footer(document: ReportDocument, total: int) -> PageCallback:
    def draw(canvas: Canvas, _template: SimpleDocTemplate) -> None:
        canvas.setFont("Helvetica", FOOTER_SIZE)
        canvas.setFillColor(DETAIL)
        canvas.drawString(MARGIN, FOOTER_Y, document.footer)
        page = document.page_text(canvas.getPageNumber(), total)
        canvas.drawRightString(LETTER[0] - MARGIN, FOOTER_Y, page)

    return draw


def _build(document: ReportDocument, footer: PageCallback) -> bytes:
    output = BytesIO()
    template = SimpleDocTemplate(
        output,
        pagesize=LETTER,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title=document.title,
    )
    story = _header(document) + [
        item for section in document.sections for item in _section(section)
    ]
    template.build(story, onFirstPage=footer, onLaterPages=footer)
    return output.getvalue()


class PdfReportRenderer:
    """Maqueta el informe en PDF tamaño carta con la fuente Helvetica de reportlab.

    Helvetica cubre tildes, eñes y comillas españolas, así no hace falta incluir otra fuente.
    Se maqueta dos veces: la primera solo cuenta las páginas para el pie «Página N de M».
    """

    def render(self, document: ReportDocument) -> bytes:
        pages: list[int] = []

        def count(canvas: Canvas, _template: SimpleDocTemplate) -> None:
            pages.append(canvas.getPageNumber())

        _build(document, count)
        return _build(document, _footer(document, len(pages)))
