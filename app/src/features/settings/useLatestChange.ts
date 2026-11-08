import { useRef } from "react";

/** El turno de un cambio de Ajustes. */
export interface ChangeTurn {
  /** Si su respuesta es más reciente que la última aplicada; si sí, queda como aplicada. */
  readonly claim: () => boolean;
  /** Si ya se guardó con éxito un cambio más nuevo del mismo tipo: su fallo ya no importa. */
  readonly isFailureStale: () => boolean;
}

/**
 * Cada respuesta de Ajustes trae la configuración completa: se aplica si es más reciente que la
 * última aplicada. Una vieja que llega tarde no hace volver la pantalla atrás, y si la última
 * falla, la anterior que sí se guardó se muestra. Un fallo se dice, salvo que un cambio más nuevo
 * del mismo tipo (`kind`) ya se haya guardado: entonces confundiría sobre el valor vigente.
 */
export function useLatestChange(): (kind: string) => ChangeTurn {
  const requested = useRef(0);
  const applied = useRef(0);
  const succeededByKind = useRef(new Map<string, number>());
  return (kind) => {
    const change = ++requested.current;
    return {
      claim: () => {
        succeededByKind.current.set(kind, Math.max(change, succeededByKind.current.get(kind) ?? 0));
        if (change <= applied.current) return false;
        applied.current = change;
        return true;
      },
      isFailureStale: () => (succeededByKind.current.get(kind) ?? 0) > change,
    };
  };
}
