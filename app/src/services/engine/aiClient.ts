import type {
  AiGateway,
  AiProviderValue,
  AiSettingsResult,
  ChangeExplanationResult,
} from "./aiTypes";
import type { EngineHttp } from "./engineHttp";

const SETTINGS_PATH = "/settings/ai";
const REQUEST_TIMEOUT_MS = 10_000;
// La explicación con IA espera la respuesta del proveedor; la del motor tarda mucho menos.
const EXPLANATION_TIMEOUT_MS = 45_000;

/** IA opcional: explicar un cambio y los ajustes de IA (la clave nunca vuelve del motor). */
export class AiClient implements AiGateway {
  constructor(private readonly http: EngineHttp) {}

  explainChange(
    comparisonId: string,
    number: number,
    locale: string,
  ): Promise<ChangeExplanationResult> {
    const id = encodeURIComponent(comparisonId);
    return this.explanation(`/comparisons/${id}/changes/${String(number)}`, locale);
  }

  explainAlert(
    sessionId: string,
    number: number,
    locale: string,
  ): Promise<ChangeExplanationResult> {
    const id = encodeURIComponent(sessionId);
    return this.explanation(`/reviews/${id}/alerts/${String(number)}`, locale);
  }

  aiSettings(): Promise<AiSettingsResult> {
    return this.http.json({ path: SETTINGS_PATH, timeoutMs: REQUEST_TIMEOUT_MS });
  }

  setExplainsChanges(enabled: boolean): Promise<AiSettingsResult> {
    return this.updateSettings({ explainsChanges: enabled });
  }

  setProvider(provider: AiProviderValue): Promise<AiSettingsResult> {
    return this.updateSettings({ provider });
  }

  storeKey(key: string): Promise<AiSettingsResult> {
    const path = `${SETTINGS_PATH}/key`;
    return this.http.json({ path, timeoutMs: REQUEST_TIMEOUT_MS, method: "PUT", body: { key } });
  }

  removeKey(): Promise<AiSettingsResult> {
    const path = `${SETTINGS_PATH}/key`;
    return this.http.json({ path, timeoutMs: REQUEST_TIMEOUT_MS, method: "DELETE" });
  }

  private updateSettings(body: object): Promise<AiSettingsResult> {
    return this.http.json({
      path: SETTINGS_PATH,
      timeoutMs: REQUEST_TIMEOUT_MS,
      method: "PUT",
      body,
    });
  }

  private explanation(itemPath: string, locale: string): Promise<ChangeExplanationResult> {
    const query = new URLSearchParams({ locale });
    const path = `${itemPath}/explanation?${query.toString()}`;
    return this.http.json({ path, timeoutMs: EXPLANATION_TIMEOUT_MS });
  }
}
