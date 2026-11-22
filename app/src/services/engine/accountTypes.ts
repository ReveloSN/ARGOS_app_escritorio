/** La cuenta como puerta de entrada (engine/argus/api/schemas/account.py). Sin tokens ni contraseñas. */

export type AccountStatusValue = "unavailable" | "signed_out" | "signed_in" | "expired";

export interface AccountResult {
  readonly id: string;
  readonly email: string;
  readonly displayName: string | null;
}

export interface AccountStateResult {
  readonly status: AccountStatusValue;
  readonly account: AccountResult | null;
  /** Con la sesión vencida, para rellenar el formulario. */
  readonly email: string | null;
  readonly gateSkipped: boolean;
  readonly isOffline: boolean;
  /** Falso: sin llavero, la sesión dura mientras la app esté abierta. */
  readonly isPersisted: boolean;
}

export interface SignUpOutcome {
  readonly state: AccountStateResult;
  readonly needsConfirmation: boolean;
}

export interface SignInForm {
  readonly email: string;
  readonly password: string;
}

export interface SignUpForm extends SignInForm {
  readonly displayName?: string;
}

export interface VerifyForm {
  readonly email: string;
  readonly code: string;
}

export interface PasswordResetForm extends SignInForm {
  readonly code: string;
}

/** Motivos que el motor informa en `detail` (AccountProblem, más el del llavero). */
export type AccountProblemValue =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "invalid_code"
  | "email_taken"
  | "weak_password"
  | "same_password"
  | "invalid_value"
  | "rate_limited"
  | "email_unavailable"
  | "service_rejected"
  | "offline"
  | "keychain_unavailable"
  | "account_unavailable";

export interface AccountGateway {
  account(): Promise<AccountStateResult>;
  refresh(): Promise<AccountStateResult>;
  skip(): Promise<AccountStateResult>;
  signOut(): Promise<AccountStateResult>;
  signUp(form: SignUpForm): Promise<SignUpOutcome>;
  verify(form: VerifyForm): Promise<AccountStateResult>;
  signIn(form: SignInForm): Promise<AccountStateResult>;
  resendSignUpCode(email: string): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  confirmPasswordReset(form: PasswordResetForm): Promise<AccountStateResult>;
}
