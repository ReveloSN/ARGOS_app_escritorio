import { useEffect, useRef, useState, type RefObject } from "react";

import type { AccountGateway } from "../../services/engine/accountTypes";
import { WHEN_READY_TIMEOUT_MS } from "../../services/engine/engineStatusMonitor";
import { useEngineStatus } from "../engine/useEngineStatus";
import { useReloadWhenEngineReady } from "../settings/useReloadWhenEngineReady";
import { FirstAccountRead, type FirstReadContext } from "./FirstAccountRead";
import type { AccountStore } from "./useAccountStore";
import type { GateControl } from "./useGate";

/** Lo último que la lectura necesita saber, sin que su identidad dispare nada. */
function useLatestContext(parts: Omit<FirstReadContext, "isEngineReady">) {
  const isEngineReady = useEngineStatus() === "ready";
  const latest = useRef<FirstReadContext>({ ...parts, isEngineReady });
  useEffect(() => {
    latest.current = { ...parts, isEngineReady };
  });
  return latest;
}

function useReader(latest: RefObject<FirstReadContext>) {
  const [isPending, setPending] = useState(true);
  const settle = () => {
    setPending(false);
  };
  const [reader] = useState(() => new FirstAccountRead(() => latest.current, settle));
  return { reader, isPending };
}

/**
 * Sin motor no hay lectura que esperar: si se detuvo o no terminó de arrancar en el plazo. No se
 * desdice: lo que ya se mostró no se retira porque el motor vuelva a arrancar.
 */
function useHasStoppedWaiting(): boolean {
  const status = useEngineStatus();
  const [hasStopped, setStopped] = useState(false);
  useEffect(() => {
    if (status === "stopped") setStopped(true);
  }, [status]);
  useEffect(() => {
    const deadline = setTimeout(() => {
      setStopped(true);
    }, WHEN_READY_TIMEOUT_MS);
    return () => {
      clearTimeout(deadline);
    };
  }, []);
  return hasStopped;
}

/** Lee la cuenta al arrancar y de nuevo cuando el motor responde. Devuelve si hay que esperarla. */
export function useFirstAccountRead(
  gateway: AccountGateway,
  store: AccountStore,
  gate: GateControl,
): boolean {
  const latest = useLatestContext({ gateway, store, gate });
  const { reader, isPending } = useReader(latest);
  const hasStoppedWaiting = useHasStoppedWaiting();
  useEffect(() => {
    reader.read();
    return () => {
      reader.stop();
    };
  }, [reader]);
  useReloadWhenEngineReady(() => {
    reader.read();
  });
  return isPending && !hasStoppedWaiting;
}
