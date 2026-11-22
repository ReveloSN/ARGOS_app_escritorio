import type { GateFormState } from "./useGateForm";

export type GateView = "signIn" | "signUp" | "verify" | "recover" | "reset";

export type GoToView = (view: GateView) => void;

/** Lo que recibe cada vista de la puerta; el correo pasa de una vista a la siguiente. */
export interface GateViewProps {
  readonly form: GateFormState;
  readonly view: GateView;
  /** El correo vive en la puerta: no se pierde al cambiar de vista. */
  readonly email: string;
  readonly setEmail: (email: string) => void;
  /** Navegación de la persona: no hace nada mientras hay una petición en curso. */
  readonly go: GoToView;
  /** Navegación al terminar la petición de esta vista; lo único que puede cambiarla en vuelo. */
  readonly advance: GoToView;
  /** El primer campo toma el foco al abrir la vista; con el selector de pestañas, no. */
  readonly autoFocus: boolean;
}
