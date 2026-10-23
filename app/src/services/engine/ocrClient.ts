import type { EngineHttp } from "./engineHttp";
import type { OcrGateway, OcrProcessorInput, OcrSettingsResult } from "./ocrTypes";

const SETTINGS_PATH = "/settings/ocr";
const REQUEST_TIMEOUT_MS = 10_000;

/** Ajustes › OCR; la clave de la cuenta de servicio va al llavero y nunca vuelve del motor. */
export class OcrClient implements OcrGateway {
  constructor(private readonly http: EngineHttp) {}

  ocrSettings(): Promise<OcrSettingsResult> {
    return this.http.json({ path: SETTINGS_PATH, timeoutMs: REQUEST_TIMEOUT_MS });
  }

  setUsesCloud(enabled: boolean): Promise<OcrSettingsResult> {
    return this.put(SETTINGS_PATH, { usesCloud: enabled });
  }

  setProcessor(processor: OcrProcessorInput): Promise<OcrSettingsResult> {
    return this.put(`${SETTINGS_PATH}/processor`, processor);
  }

  storeCredentials(credentials: string): Promise<OcrSettingsResult> {
    return this.put(`${SETTINGS_PATH}/credentials`, { credentials });
  }

  removeCredentials(): Promise<OcrSettingsResult> {
    const path = `${SETTINGS_PATH}/credentials`;
    return this.http.json({ path, timeoutMs: REQUEST_TIMEOUT_MS, method: "DELETE" });
  }

  private put(path: string, body: object): Promise<OcrSettingsResult> {
    return this.http.json({ path, timeoutMs: REQUEST_TIMEOUT_MS, method: "PUT", body });
  }
}
