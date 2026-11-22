import { createContext, useContext } from "react";

import type {
  AccountStateResult,
  PasswordResetForm,
  SignInForm,
  SignUpForm,
  VerifyForm,
} from "../../services/engine/accountTypes";

export interface GateState {
  /** Correo con el que se rellena el formulario (la sesión vencida lo conserva). */
  readonly email: string | null;
}

export interface SignUpAnswer {
  readonly needsConfirmation: boolean;
}

/** Cada acción rechaza con el error del cliente; su efecto en el estado de la cuenta no espera a la vista. */
export interface AccountActions {
  readonly signIn: (form: SignInForm) => Promise<void>;
  readonly signUp: (form: SignUpForm) => Promise<SignUpAnswer>;
  readonly verify: (form: VerifyForm) => Promise<void>;
  readonly resendCode: (email: string) => Promise<void>;
  readonly requestReset: (email: string) => Promise<void>;
  readonly confirmReset: (form: PasswordResetForm) => Promise<void>;
  readonly skip: () => Promise<void>;
  readonly signOut: () => Promise<void>;
}

export interface AccountContextValue {
  /** `null` mientras no hay una primera lectura: sin ella no existe nada de la cuenta. */
  readonly state: AccountStateResult | null;
  readonly gate: GateState | null;
  /** Verdadero hasta que la cuenta responde, su lectura falla con el motor listo o no hay motor. */
  readonly isFirstReadPending: boolean;
  readonly openGate: (email?: string | null) => void;
  readonly closeGate: () => void;
  readonly actions: AccountActions;
}

export const AccountContext = createContext<AccountContextValue | null>(null);

export function useAccount(): AccountContextValue {
  const value = useContext(AccountContext);
  if (!value) throw new Error("Falta AccountProvider en la raíz de la app.");
  return value;
}

/** Si hay cuenta que mostrar: con `unavailable`, o sin lectura, ninguna pantalla existe. */
export function hasAccountFeature(state: AccountStateResult | null): boolean {
  return state !== null && state.status !== "unavailable";
}
