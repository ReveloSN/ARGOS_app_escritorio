from fastapi import APIRouter, Response

from argus.api.composition import EngineServices
from argus.api.report_composition import ReportChannel
from argus.api.schemas.report import (
    ExportReportBody,
    OpenReportBody,
    ReportLocationResponse,
    ReportPlanResponse,
)
from argus.application.export_report import ExportRequest, SavedReport

NO_CONTENT = 204


def _location(saved: SavedReport) -> ReportLocationResponse:
    return ReportLocationResponse(folder=saved.folder, file_name=saved.file_name)


def build_reports_router(services: EngineServices) -> APIRouter:
    """Informe del expediente en PDF o DOCX, guardado en Documentos/ARGUS (mockup Informe)."""
    reports = services.reports
    channel = ReportChannel(reports.export, reports.open)
    return _report_router("/reviews/{session_id}/report", channel, reports.version)


def build_comparison_reports_router(services: EngineServices) -> APIRouter:
    """El mismo informe para una comparación: su carpeta lleva el nombre de la comparación."""
    reports = services.reports
    return _report_router("/comparisons/{session_id}/report", reports.comparison, reports.version)


def _report_router(prefix: str, channel: ReportChannel, version: str) -> APIRouter:
    # El parámetro se llama session_id en las dos rutas: es el identificador de lo que se informa.
    router = APIRouter(prefix=prefix)

    @router.get("")
    def report_location(session_id: str) -> ReportPlanResponse:
        planned = channel.export.folder(session_id)
        return ReportPlanResponse(
            folder=planned.folder, file_name=planned.file_name, version=version
        )

    @router.post("")
    def export_report(session_id: str, body: ExportReportBody) -> ReportLocationResponse:
        request = ExportRequest(session_id, body.format, body.document.to_document())
        return _location(channel.export.execute(request))

    @router.post("/open", status_code=NO_CONTENT)
    def open_report(session_id: str, body: OpenReportBody) -> Response:
        channel.open.execute(session_id, body.file_name)
        return Response(status_code=NO_CONTENT)

    return router
