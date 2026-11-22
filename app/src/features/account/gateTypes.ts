import type { GateFormState } from "./useGateForm";

export type GateView = "signIn" | "signUp" | "verify" | "recover" | "reset";

export type GoToView = (view: GateView, email?: string) => void;

/** Lo que recibe cada vista de la puerta; el correo pasa de una vista a la siguiente. */
export interface GateViewProps {
  readonly form: GateFormState;
  readonly email: string;
  readonly go: GoToView;
  /** El primer campo toma el foco al abrir la vista; con el selector de pestañas, no. */
  readonly autoFocus: boolean;
}
