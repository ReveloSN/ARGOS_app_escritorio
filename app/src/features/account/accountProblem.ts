import type { AccountProblemValue } from "../../services/engine/accountTypes";
import { EngineRejectedError, EngineUnavailableError } from "../../services/engine/engineHttp";

/** Lo que la interfaz sabe decir: los motivos de la cuenta, el motor sin responder y el tiempo. */
export type AccountProblem = AccountProblemValue | "engine_unavailable" | "timeout";

/** Qué puede hacer la persona ahora; cada motivo trae su acción, con botón (CLAUDE.md §9). */
export type ProblemAction = "dismiss" | "retry" | "signIn" | "verify" | "recover";

export const PROBLEM_ACTIONS: Readonly<Record<AccountProblem, ProblemAction>> = {
  invalid_credentials: "recover",
  email_not_confirmed: "verify",
  invalid_code: "recover",
  email_taken: "signIn",
  weak_password: "dismiss",
  same_password: "dismiss",
  invalid_value: "dismiss",
  rate_limited: "dismiss",
  email_unavailable: "signIn",
  service_rejected: "retry",
  offline: "retry",
  keychain_unavailable: "retry",
  account_unavailable: "dismiss",
  engine_unavailable: "retry",
  timeout: "retry",
};

const KNOWN_PROBLEMS = new Set<string>(Object.keys(PROBLEM_ACTIONS));

function isTimeout(error: EngineUnavailableError): boolean {
  return error.cause instanceof DOMException && error.cause.name === "TimeoutError";
}

/** Traduce lo que lanzó el cliente al motivo que se le muestra a la persona. */
export function problemOf(error: unknown): AccountProblem {
  if (error instanceof EngineRejectedError && KNOWN_PROBLEMS.has(error.detail)) {
    return error.detail as AccountProblem;
  }
  if (error instanceof EngineUnavailableError && isTimeout(error)) return "timeout";
  return "engine_unavailable";
}
