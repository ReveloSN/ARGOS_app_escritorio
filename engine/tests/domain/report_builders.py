"""El informe del expediente 2026-118 de los mockups, ya redactado como lo envía la interfaz."""

from argus.domain.report_document import (
    ReportCell,
    ReportDocument,
    ReportMetric,
    ReportSection,
    ReportTable,
)

EVIDENCE = ReportTable(
    ("Dato", "Valor A · origen", "Valor B · origen"),
    (
        (
            ReportCell("Identificador"),
            ReportCell("4857", "Contrato_4857_v3.docx · Página 1"),
            ReportCell("4587", "Anexo_1_condiciones.pdf · Página 1"),
        ),
    ),
)


def report_document() -> ReportDocument:
    return ReportDocument(
        "Informe de revisión documental",
        ("Expediente 2026-118 · Arrendamiento bodega Fontibón",),
        "ARGUS",
        (
            ReportSection(
                "1. Resumen",
                ("Se revisaron 2 documentos. Quedan pendientes: Monto.",),
                (ReportMetric("2", "alertas"), ReportMetric("1", "errores reales")),
            ),
            ReportSection("2. Evidencia", table=EVIDENCE),
        ),
        "Generado con ARGUS 0.1.0 · 23/10/2026 10:14",
        "Página {page} de {total}",
    )
