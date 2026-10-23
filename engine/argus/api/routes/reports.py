from fastapi import APIRouter, Response

from argus.api.composition import EngineServices
from argus.api.schemas.report import ExportReportBody, OpenReportBody, ReportLocationResponse
from argus.application.export_report import ExportRequest, SavedReport

NO_CONTENT = 204


def _location(saved: SavedReport) -> ReportLocationResponse:
    return ReportLocationResponse(folder=saved.folder, file_name=saved.file_name)


def build_reports_router(services: EngineServices) -> APIRouter:
    """Informe del expediente en PDF o DOCX, guardado en Documentos/ARGUS (mockup Informe)."""
    router = APIRouter(prefix="/reviews/{session_id}/report")
    reports = services.reports

    @router.get("")
    def report_location(session_id: str) -> ReportLocationResponse:
        return _location(reports.export.folder(session_id))

    @router.post("")
    def export_report(session_id: str, body: ExportReportBody) -> ReportLocationResponse:
        request = ExportRequest(session_id, body.format, body.document.to_document())
        return _location(reports.export.execute(request))

    @router.post("/open", status_code=NO_CONTENT)
    def open_report(session_id: str, body: OpenReportBody) -> Response:
        reports.open.execute(session_id, body.file_name)
        return Response(status_code=NO_CONTENT)

    return router
