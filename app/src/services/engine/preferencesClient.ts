import type { EngineHttp } from "./engineHttp";
import type {
  HistoryFolderResult,
  PreferencesResult,
  PreferencesStore,
  PreferencesUpdate,
  SuppressionRuleResult,
} from "./preferencesTypes";

const REQUEST_TIMEOUT_MS = 10_000;
// Mover el historial copia la base y todos los archivos guardados: puede tardar bastante más.
const HISTORY_MOVE_TIMEOUT_MS = 300_000;

/** Ajustes de detección y privacidad, y casos que no generan alerta. */
export class PreferencesClient implements PreferencesStore {
  constructor(private readonly http: EngineHttp) {}

  preferences(): Promise<PreferencesResult> {
    return this.http.json({ path: "/preferences", timeoutMs: REQUEST_TIMEOUT_MS });
  }

  savePreferences(update: PreferencesUpdate): Promise<PreferencesResult> {
    const request = { path: "/preferences", timeoutMs: REQUEST_TIMEOUT_MS };
    return this.http.json({ ...request, method: "PUT", body: update });
  }

  suppressSimilar(sessionId: string, alertNumber: number): Promise<SuppressionRuleResult> {
    const body = { sessionId, alertNumber };
    const request = { path: "/suppression-rules", timeoutMs: REQUEST_TIMEOUT_MS };
    return this.http.json({ ...request, method: "POST", body });
  }

  removeSuppressionRule(ruleId: number): Promise<void> {
    const path = `/suppression-rules/${String(ruleId)}`;
    return this.http.empty({ path, timeoutMs: REQUEST_TIMEOUT_MS, method: "DELETE" });
  }

  moveHistoryFolder(path: string): Promise<HistoryFolderResult> {
    const request = { path: "/preferences/history-folder", timeoutMs: HISTORY_MOVE_TIMEOUT_MS };
    return this.http.json({ ...request, method: "POST", body: { path } });
  }
}
