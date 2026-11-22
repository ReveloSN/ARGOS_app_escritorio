import { useState } from "react";

import type { AdvanceView, GateView, GoToView } from "./gateTypes";
import type { GateFormState } from "./useGateForm";

export interface GateNavigation {
  readonly view: GateView;
  readonly email: string;
  readonly setEmail: (email: string) => void;
  readonly go: GoToView;
  readonly advance: AdvanceView;
  readonly switchTab: (view: GateView) => void;
  /** Con el selector de pestañas el foco se queda en él; en las demás vistas va al primer campo. */
  readonly autoFocus: boolean;
}

/** En qué vista está la puerta y el correo escrito, que no se pierde al cambiar de vista. */
export function useGateNavigation(form: GateFormState, initialEmail: string): GateNavigation {
  const [view, setView] = useState<GateView>("signIn");
  const [email, setEmail] = useState(initialEmail);
  const [isTabSwitch, setTabSwitch] = useState(false);
  const advance: AdvanceView = (next, submittedEmail) => {
    form.dismiss();
    if (submittedEmail !== undefined) setEmail(submittedEmail);
    setTabSwitch(false);
    setView(next);
  };
  // Con una petición en curso la vista no cambia: su respuesta es de la vista que la envió.
  const go: GoToView = (next) => {
    if (!form.isBusy) advance(next);
  };
  const switchTab = (next: GateView) => {
    if (form.isBusy) return;
    advance(next);
    setTabSwitch(true);
  };
  return { view, email, setEmail, go, advance, switchTab, autoFocus: !isTabSwitch };
}
