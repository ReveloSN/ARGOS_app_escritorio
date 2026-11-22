import type {
  AccountGateway,
  AccountStateResult,
  PasswordResetForm,
  SignInForm,
  SignUpForm,
  SignUpOutcome,
  VerifyForm,
} from "./accountTypes";
import type { EngineHttp } from "./engineHttp";

const ACCOUNT_PATH = "/account";
const READ_TIMEOUT_MS = 10_000;
// Todo lo que llega a Supabase, por internet, espera más que una consulta local.
const SERVICE_TIMEOUT_MS = 40_000;

/** La cuenta: leer el estado, entrar, crear, confirmar, recuperar y salir. */
export class AccountClient implements AccountGateway {
  constructor(private readonly http: EngineHttp) {}

  account(): Promise<AccountStateResult> {
    return this.http.json({ path: ACCOUNT_PATH, timeoutMs: READ_TIMEOUT_MS });
  }

  skip(): Promise<AccountStateResult> {
    return this.http.json({
      path: `${ACCOUNT_PATH}/skip`,
      timeoutMs: READ_TIMEOUT_MS,
      method: "POST",
    });
  }

  refresh(): Promise<AccountStateResult> {
    return this.post("/refresh");
  }

  signOut(): Promise<AccountStateResult> {
    return this.post("/sign-out");
  }

  signUp(form: SignUpForm): Promise<SignUpOutcome> {
    return this.post("/sign-up", form);
  }

  verify(form: VerifyForm): Promise<AccountStateResult> {
    return this.post("/verify", form);
  }

  signIn(form: SignInForm): Promise<AccountStateResult> {
    return this.post("/sign-in", form);
  }

  confirmPasswordReset(form: PasswordResetForm): Promise<AccountStateResult> {
    return this.post("/password-reset/confirm", form);
  }

  requestPasswordReset(email: string): Promise<void> {
    return this.http.empty({
      path: `${ACCOUNT_PATH}/password-reset`,
      timeoutMs: SERVICE_TIMEOUT_MS,
      method: "POST",
      body: { email },
    });
  }

  private post<Result>(route: string, body?: object): Promise<Result> {
    return this.http.json({
      path: `${ACCOUNT_PATH}${route}`,
      timeoutMs: SERVICE_TIMEOUT_MS,
      method: "POST",
      ...(body ? { body } : {}),
    });
  }
}
