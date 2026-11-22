import { useRef, useState } from "react";

import type { AccountStateResult } from "../../services/engine/accountTypes";

export interface AccountStore {
  readonly state: AccountStateResult | null;
  /**
   * Aplica el estado de la respuesta solo si es más reciente que el último aplicado: una respuesta
   * vieja que llega tarde no pisa a una nueva. Devuelve la respuesta tal cual, aplicada o no. Si se
   * descarta, avisa con `onDiscarded`: lo que cambió en el motor pudo no verse en la interfaz.
   */
  readonly accept: <Answer>(
    request: Promise<Answer>,
    stateOf: (answer: Answer) => AccountStateResult,
    onDiscarded?: () => void,
  ) => Promise<Answer>;
}

export function useAccountStore(): AccountStore {
  const [state, setState] = useState<AccountStateResult | null>(null);
  const requested = useRef(0);
  const applied = useRef(0);
  const accept: AccountStore["accept"] = (request, stateOf, onDiscarded) => {
    const turn = ++requested.current;
    return request.then((answer) => {
      if (turn > applied.current) {
        applied.current = turn;
        setState(stateOf(answer));
      } else {
        onDiscarded?.();
      }
      return answer;
    });
  };
  return { state, accept };
}
