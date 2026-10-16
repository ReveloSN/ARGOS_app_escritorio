import type { EngineHttp } from "./engineHttp";
import type { HistoryRecordResult, HistoryResult, HistorySource } from "./historyTypes";

const REQUEST_TIMEOUT_MS = 10_000;

/** Historial del periodo elegido y su registro exportable. */
export class HistoryClient implements HistorySource {
  constructor(private readonly http: EngineHttp) {}

  history(days: number): Promise<HistoryResult> {
    return this.http.json({ path: `/history?days=${String(days)}`, timeoutMs: REQUEST_TIMEOUT_MS });
  }

  records(days: number): Promise<readonly HistoryRecordResult[]> {
    const path = `/history/records?days=${String(days)}`;
    return this.http.json({ path, timeoutMs: REQUEST_TIMEOUT_MS });
  }
}
