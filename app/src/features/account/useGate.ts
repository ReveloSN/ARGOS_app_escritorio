import { useRef, useState } from "react";

import type { GateState } from "./accountContext";

export interface GateControl {
  readonly gate: GateState | null;
  readonly open: (email: string | null) => void;
  readonly close: () => void;
  /** Cierra solo si la puerta sigue siendo la que estaba abierta al lanzar la petición. */
  readonly closeIfSame: (session: number) => void;
  /** Cuenta las aperturas y cierres: una petición recuerda en cuál nació. */
  readonly session: () => number;
}

/** La puerta, abierta o cerrada. Una respuesta tardía nunca la reabre ni cierra una nueva. */
export function useGate(): GateControl {
  const [gate, setGate] = useState<GateState | null>(null);
  const sessions = useRef(0);
  const close = () => {
    sessions.current += 1;
    setGate(null);
  };
  return {
    gate,
    open: (email) => {
      sessions.current += 1;
      setGate({ email });
    },
    close,
    closeIfSame: (session) => {
      if (session === sessions.current) close();
    },
    session: () => sessions.current,
  };
}
