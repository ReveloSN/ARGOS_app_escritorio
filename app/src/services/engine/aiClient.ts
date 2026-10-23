import type { AiGateway, AiSettingsResult, ChangeExplanationResult } from "./aiTypes";
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
    const query = new URLSearchParams({ locale });
    const id = encodeURIComponent(comparisonId);
    const path = `/comparisons/${id}/changes/${String(number)}/explanation?${query.toString()}`;
    return this.http.json({ path, timeoutMs: EXPLANATION_TIMEOUT_MS });
  }

  aiSettings(): Promise<AiSettingsResult> {
    return this.http.json({ path: SETTINGS_PATH, timeoutMs: REQUEST_TIMEOUT_MS });
  }

  setExplainsChanges(enabled: boolean): Promise<AiSettingsResult> {
    const body = { explainsChanges: enabled };
    return this.http.json({
      path: SETTINGS_PATH,
      timeoutMs: REQUEST_TIMEOUT_MS,
      method: "PUT",
      body,
    });
  }

  storeKey(key: string): Promise<AiSettingsResult> {
    const path = `${SETTINGS_PATH}/key`;
    return this.http.json({ path, timeoutMs: REQUEST_TIMEOUT_MS, method: "PUT", body: { key } });
  }

  removeKey(): Promise<AiSettingsResult> {
    const path = `${SETTINGS_PATH}/key`;
    return this.http.json({ path, timeoutMs: REQUEST_TIMEOUT_MS, method: "DELETE" });
  }
}
