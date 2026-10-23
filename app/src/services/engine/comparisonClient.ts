import type {
  ComparisonGateway,
  ComparisonProgressEvent,
  ComparisonRequest,
  ComparisonResult,
} from "./comparisonTypes";
import type { EngineHttp } from "./engineHttp";
import type { DecisionInput, DecisionsResult } from "./reviewTypes";
import { progressEventOf, streamUpload } from "./streamedUpload";

const COMPARISONS_PATH = "/comparisons";
const COMPARISON_FINISHED_EVENT = "comparison";
// Comparar todos contra todos tarda más que una revisión: cada par se alinea por separado.
const COMPARISON_TIMEOUT_MS = 180_000;
const REQUEST_TIMEOUT_MS = 10_000;

function comparisonPath(comparisonId: string, suffix = ""): string {
  return `${COMPARISONS_PATH}/${encodeURIComponent(comparisonId)}${suffix}`;
}

/** Comparaciones en el motor: iniciar con avance, reabrir, decidir y deshacer. */
export class ComparisonClient implements ComparisonGateway {
  constructor(private readonly http: EngineHttp) {}

  startComparison({ name, mode, files, onProgress }: ComparisonRequest): Promise<ComparisonResult> {
    const upload = {
      path: COMPARISONS_PATH,
      fields: { name, mode },
      files,
      timeoutMs: COMPARISON_TIMEOUT_MS,
      finishedEvent: COMPARISON_FINISHED_EVENT,
    };
    return streamUpload(this.http, upload, (event) =>
      onProgress?.(progressEventOf(event) as ComparisonProgressEvent),
    );
  }

  openComparison(comparisonId: string): Promise<ComparisonResult> {
    return this.http.json({ path: comparisonPath(comparisonId), timeoutMs: REQUEST_TIMEOUT_MS });
  }

  decide(comparisonId: string, decision: DecisionInput): Promise<DecisionsResult> {
    const body = { number: decision.alertNumber, kind: decision.kind };
    const request = {
      path: comparisonPath(comparisonId, "/decisions"),
      timeoutMs: REQUEST_TIMEOUT_MS,
    };
    return this.http.json({ ...request, method: "POST", body });
  }

  undoDecision(comparisonId: string): Promise<DecisionsResult> {
    const path = comparisonPath(comparisonId, "/decisions/undo");
    return this.http.json({ path, timeoutMs: REQUEST_TIMEOUT_MS, method: "POST" });
  }
}
