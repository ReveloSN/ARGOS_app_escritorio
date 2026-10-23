import type { EngineHttp } from "./engineHttp";
import type {
  ReportDocumentData,
  ReportFormatValue,
  ReportGateway,
  ReportLocation,
  ReportPlan,
} from "./reportTypes";

const REQUEST_TIMEOUT_MS = 10_000;
// Maquetar un informe largo en PDF puede tardar unos segundos.
const EXPORT_TIMEOUT_MS = 60_000;
// Abrir el informe lanza otra aplicación del sistema.
const OPEN_TIMEOUT_MS = 20_000;

function reportPath(sessionId: string, suffix = ""): string {
  return `/reviews/${encodeURIComponent(sessionId)}/report${suffix}`;
}

/** Informe del expediente: dónde se guarda, exportarlo en PDF o DOCX y abrirlo. */
export class ReportClient implements ReportGateway {
  constructor(private readonly http: EngineHttp) {}

  planReport(sessionId: string): Promise<ReportPlan> {
    return this.http.json({ path: reportPath(sessionId), timeoutMs: REQUEST_TIMEOUT_MS });
  }

  exportReport(
    sessionId: string,
    format: ReportFormatValue,
    document: ReportDocumentData,
  ): Promise<ReportLocation> {
    const request = { path: reportPath(sessionId), timeoutMs: EXPORT_TIMEOUT_MS };
    return this.http.json({ ...request, method: "POST", body: { format, document } });
  }

  openReport(sessionId: string, fileName: string): Promise<void> {
    const request = { path: reportPath(sessionId, "/open"), timeoutMs: OPEN_TIMEOUT_MS };
    return this.http.empty({ ...request, method: "POST", body: { fileName } });
  }
}
