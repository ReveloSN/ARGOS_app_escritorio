import type { EngineHttp } from "./engineHttp";
import type { DecisionInput, DecisionsResult } from "./reviewTypes";
import type { SendGateway, SendReviewRequest, SendReviewResult } from "./sendTypes";

const SEND_REVIEWS_PATH = "/send-reviews";
// Leer el borrador y sus adjuntos tarda más que una consulta: cada adjunto se lee aparte.
const REVIEW_TIMEOUT_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;
// Abrir la copia lanza el cliente de correo del sistema; puede tardar un poco más.
const OPEN_TIMEOUT_MS = 20_000;

function reviewPath(reviewId: string, suffix: string): string {
  return `${SEND_REVIEWS_PATH}/${encodeURIComponent(reviewId)}${suffix}`;
}

/** Borradores revisados antes de enviar: revisar, decidir, deshacer y abrir la copia corregida. */
export class SendClient implements SendGateway {
  constructor(private readonly http: EngineHttp) {}

  reviewDraft({ file, sessionId }: SendReviewRequest): Promise<SendReviewResult> {
    const body = new FormData();
    body.append("file", file, file.name);
    if (sessionId) body.append("sessionId", sessionId);
    const request = { path: SEND_REVIEWS_PATH, timeoutMs: REVIEW_TIMEOUT_MS };
    return this.http.json({ ...request, method: "POST", body });
  }

  decide(reviewId: string, decision: DecisionInput): Promise<DecisionsResult> {
    const body = { number: decision.alertNumber, kind: decision.kind };
    const path = reviewPath(reviewId, "/decisions");
    return this.http.json({ path, timeoutMs: REQUEST_TIMEOUT_MS, method: "POST", body });
  }

  undoDecision(reviewId: string): Promise<DecisionsResult> {
    const path = reviewPath(reviewId, "/decisions/undo");
    return this.http.json({ path, timeoutMs: REQUEST_TIMEOUT_MS, method: "POST" });
  }

  openCorrected(reviewId: string): Promise<void> {
    const path = reviewPath(reviewId, "/open");
    return this.http.empty({ path, timeoutMs: OPEN_TIMEOUT_MS, method: "POST" });
  }
}
