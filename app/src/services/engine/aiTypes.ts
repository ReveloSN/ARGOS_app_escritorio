/** IA opcional (engine/argus/api/schemas/ai.py): explicar un cambio y Ajustes de IA. */

import type { ExplanationPartResult } from "./reviewTypes";

export type ExplanationSourceValue = "ai" | "template";
export type FallbackReasonValue =
  "no_key" | "keychain_unavailable" | "provider_unavailable" | "invalid_key" | "refused";

export interface ChangeExplanationResult {
  /** «ai»: la redactó el modelo («Sugerencia de IA»); «template»: plantilla local. */
  readonly source: ExplanationSourceValue;
  readonly parts: readonly ExplanationPartResult[];
  readonly text: string;
  /** Por qué se usó la plantilla con la IA activada; null si no hubo problema. */
  readonly fallbackReason: FallbackReasonValue | null;
}

export interface AiSettingsResult {
  readonly explainsChanges: boolean;
  readonly hasKey: boolean;
  readonly isKeychainAvailable: boolean;
  readonly provider: string;
  readonly model: string;
}

/** Puerto de la interfaz para la IA opcional; el cliente HTTP lo implementa. */
export interface AiGateway {
  explainChange(
    comparisonId: string,
    number: number,
    locale: string,
  ): Promise<ChangeExplanationResult>;
  aiSettings(): Promise<AiSettingsResult>;
  setExplainsChanges(enabled: boolean): Promise<AiSettingsResult>;
  storeKey(key: string): Promise<AiSettingsResult>;
  removeKey(): Promise<AiSettingsResult>;
}
