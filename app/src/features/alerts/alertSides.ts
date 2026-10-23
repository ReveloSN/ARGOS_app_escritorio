import type { AlertResult, AlertSideResult } from "../../services/engine/reviewTypes";

// Las verificaciones de un solo dato (fecha imposible, campo vacío) no tienen Valor B.
export const NO_SECOND_VALUE = "—";

/** Los valores de la alerta: uno o dos, cada uno con sus apariciones. */
export function alertSides(alert: AlertResult): AlertSideResult[] {
  return alert.second ? [alert.first, alert.second] : [alert.first];
}

export function secondValue(alert: AlertResult): string {
  return alert.second?.value ?? NO_SECOND_VALUE;
}
