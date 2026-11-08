import { EngineRejectedError } from "../../services/engine/engineHttp";
import type { FactsResult } from "../../services/engine/factTypes";

// El motor responde así cuando el texto no contiene un valor del tipo elegido.
const UNRECOGNIZED_VALUE = "unrecognized_fact_value";

/** Un cambio que no se guardó, con lo necesario para explicarlo y reintentarlo. */
export interface FactFailure {
  readonly label: string;
  /** El valor escrito, si el motor no lo reconoció; null si el motor no respondió. */
  readonly unrecognizedValue: string | null;
  readonly retry: () => void;
}

export interface FactChange {
  readonly send: () => Promise<FactsResult>;
  readonly label: string;
  readonly message: string;
  readonly value?: string;
  readonly onSaved?: () => void;
}

function unrecognizedValue(error: unknown, change: FactChange): string | null {
  const isUnrecognized =
    error instanceof EngineRejectedError && error.detail === UNRECOGNIZED_VALUE;
  return isUnrecognized ? (change.value ?? null) : null;
}

export function failureOf(error: unknown, change: FactChange, retry: () => void): FactFailure {
  return { label: change.label, unrecognizedValue: unrecognizedValue(error, change), retry };
}
