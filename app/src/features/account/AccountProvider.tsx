import type { ReactNode } from "react";

import { useEngineServices } from "../engine/EngineServicesContext";
import { AccountContext, type AccountContextValue } from "./accountContext";
import { useAccountActions } from "./useAccountActions";
import { useAccountStore } from "./useAccountStore";
import { useFirstAccountRead } from "./useFirstAccountRead";
import { useGate } from "./useGate";

/** La cuenta de ARGUS: su estado, la puerta de entrada y las acciones que la cambian. */
export function AccountProvider({ children }: { readonly children: ReactNode }) {
  const { account: gateway } = useEngineServices();
  const store = useAccountStore();
  const gate = useGate();
  const actions = useAccountActions(gateway, store, gate);
  useFirstAccountRead(gateway, store, gate);
  const value: AccountContextValue = {
    state: store.state,
    gate: gate.gate,
    openGate: (email = null) => {
      gate.open("settings", email);
    },
    closeGate: gate.close,
    actions,
  };
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
