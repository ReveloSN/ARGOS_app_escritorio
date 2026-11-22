import { useEffect, useRef } from "react";

import type { AccountGateway, AccountStateResult } from "../../services/engine/accountTypes";
import { useReloadWhenEngineReady } from "../settings/useReloadWhenEngineReady";
import type { AccountStore } from "./useAccountStore";
import type { GateControl } from "./useGate";

const identity = (state: AccountStateResult) => state;

interface Collaborators {
  readonly gateway: AccountGateway;
  readonly store: AccountStore;
  readonly gate: GateControl;
}

/** Solo con `signed_out` y sin la marca de «Continuar sin cuenta» se abre; con sesión, se renueva. */
function actOnFirstRead(state: AccountStateResult, { gateway, store, gate }: Collaborators) {
  if (state.status === "signed_out" && !state.gateSkipped) gate.open("startup", null);
  if (state.status === "signed_in") {
    store.accept(gateway.refresh(), identity).catch(() => undefined);
  }
}

function readUntilDecided(isDecided: { current: boolean }, current: Collaborators): void {
  if (isDecided.current) return;
  current.store.accept(current.gateway.account(), identity).then(
    (state) => {
      if (isDecided.current) return;
      isDecided.current = true;
      actOnFirstRead(state, current);
    },
    () => undefined,
  );
}

/**
 * La primera lectura que llega decide, una sola vez por ejecución, si la puerta se abre. El motor
 * puede tardar en responder: si falla, se repite cuando pasa a responder.
 */
export function useFirstAccountRead(
  gateway: AccountGateway,
  store: AccountStore,
  gate: GateControl,
): void {
  const isDecided = useRef(false);
  const latest = useRef<Collaborators>({ gateway, store, gate });
  useEffect(() => {
    latest.current = { gateway, store, gate };
  });
  const read = () => {
    readUntilDecided(isDecided, latest.current);
  };
  useEffect(read, []);
  useReloadWhenEngineReady(read);
}
