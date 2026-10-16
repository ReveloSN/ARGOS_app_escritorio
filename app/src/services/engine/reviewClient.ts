import { EngineUnavailableError, type EngineHttp, type EngineRequest } from "./engineHttp";
import type {
  DecisionInput,
  DecisionsResult,
  ReviewGateway,
  ReviewProgressEvent,
  ReviewRequest,
  ReviewResult,
  SessionResult,
} from "./reviewTypes";
import type { ServerSentEvent } from "./serverSentEvents";

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

  async startReview({ name, files, onProgress }: ReviewRequest): Promise<ReviewResult> {
    let review: ReviewResult | undefined;
    const request: EngineRequest = {
      path: REVIEWS_PATH,
      timeoutMs: REVIEW_TIMEOUT_MS,
      method: "POST",
      body: reviewForm(name, files),
    };
    await this.http.stream(request, (event) => {
      if (event.name === REVIEW_FINISHED_EVENT) review = event.data as ReviewResult;
      else onProgress?.(toProgressEvent(event));
    });
    // Sin el evento final, el análisis se interrumpió en el motor.
    if (!review) throw new EngineUnavailableError(REVIEWS_PATH);
    return review;
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

function reviewForm(name: string, files: readonly File[]): FormData {
  const body = new FormData();
  body.append("name", name);
  files.forEach((file) => {
    body.append("files", file, file.name);
  });
  return body;
}

function toProgressEvent(event: ServerSentEvent): ReviewProgressEvent {
  return { kind: event.name, ...(event.data as object) } as ReviewProgressEvent;
}
