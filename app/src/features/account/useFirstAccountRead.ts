import { useEffect, useRef, useState, type RefObject } from "react";

import type { AccountGateway } from "../../services/engine/accountTypes";
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

/** Lee la cuenta al arrancar y de nuevo cuando el motor responde. Devuelve si sigue pendiente. */
export function useFirstAccountRead(
  gateway: AccountGateway,
  store: AccountStore,
  gate: GateControl,
): boolean {
  const latest = useLatestContext({ gateway, store, gate });
  const { reader, isPending } = useReader(latest);
  useEffect(() => {
    reader.read();
    return () => {
      reader.stop();
    };
  }, [reader]);
  useReloadWhenEngineReady(() => {
    reader.read();
  });
  return isPending;
}
