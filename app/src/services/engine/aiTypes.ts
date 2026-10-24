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

export type AiProviderValue = "anthropic" | "deepseek";

export interface AiProviderResult {
  readonly id: AiProviderValue;
  readonly model: string;
}

export interface AiSettingsResult {
  readonly explainsChanges: boolean;
  /** El proveedor elegido; la clave y el llavero se refieren a él. */
  readonly provider: AiProviderValue;
  readonly model: string;
  readonly hasKey: boolean;
  readonly isKeychainAvailable: boolean;
  readonly providers: readonly AiProviderResult[];
}

/** Puerto de la interfaz para la IA opcional; el cliente HTTP lo implementa. */
export interface AiGateway {
  explainChange(
    comparisonId: string,
    number: number,
    locale: string,
  ): Promise<ChangeExplanationResult>;
  explainAlert(sessionId: string, number: number, locale: string): Promise<ChangeExplanationResult>;
  aiSettings(): Promise<AiSettingsResult>;
  setExplainsChanges(enabled: boolean): Promise<AiSettingsResult>;
  setProvider(provider: AiProviderValue): Promise<AiSettingsResult>;
  storeKey(key: string): Promise<AiSettingsResult>;
  removeKey(): Promise<AiSettingsResult>;
}
