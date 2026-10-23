import type { EngineHttp } from "./engineHttp";
import type {
  DecisionInput,
  DecisionsResult,
  ReviewGateway,
  ReviewProgressEvent,
  ReviewRequest,
  ReviewResult,
  SessionResult,
} from "./reviewTypes";
import { progressEventOf, streamUpload } from "./streamedUpload";

const REVIEWS_PATH = "/reviews";
const REVIEW_FINISHED_EVENT = "review";
// Leer y comparar varios archivos tarda; pasado este límite se informa que el análisis se detuvo.
const REVIEW_TIMEOUT_MS = 120_000;
const REQUEST_TIMEOUT_MS = 10_000;

function sessionPath(sessionId: string, suffix = ""): string {
  return `${REVIEWS_PATH}/${encodeURIComponent(sessionId)}${suffix}`;
}

/** Revisiones en el motor: iniciar con avance por archivo, reabrir, cerrar y decidir. */
export class ReviewClient implements ReviewGateway {
  constructor(private readonly http: EngineHttp) {}

  startReview({ name, files, onProgress }: ReviewRequest): Promise<ReviewResult> {
    const upload = { path: REVIEWS_PATH, fields: { name }, files, timeoutMs: REVIEW_TIMEOUT_MS };
    return streamUpload(this.http, { ...upload, finishedEvent: REVIEW_FINISHED_EVENT }, (event) =>
      onProgress?.(progressEventOf(event) as ReviewProgressEvent),
    );
  }

  openReview(sessionId: string): Promise<ReviewResult> {
    return this.http.json({ path: sessionPath(sessionId), timeoutMs: REQUEST_TIMEOUT_MS });
  }

  closeReview(sessionId: string): Promise<SessionResult> {
    const path = sessionPath(sessionId, "/close");
    return this.http.json({ path, timeoutMs: REQUEST_TIMEOUT_MS, method: "POST" });
  }

  decide(sessionId: string, decision: DecisionInput): Promise<DecisionsResult> {
    const path = sessionPath(sessionId, "/decisions");
    return this.http.json({ path, timeoutMs: REQUEST_TIMEOUT_MS, method: "POST", body: decision });
  }

  undoDecision(sessionId: string): Promise<DecisionsResult> {
    const path = sessionPath(sessionId, "/decisions/undo");
    return this.http.json({ path, timeoutMs: REQUEST_TIMEOUT_MS, method: "POST" });
  }
}
