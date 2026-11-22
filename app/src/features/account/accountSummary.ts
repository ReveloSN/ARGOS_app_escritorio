import type { AccountSummary } from "../../components/molecules/AccountBadge";
import type { I18n } from "../../i18n/i18nContext";
import type { AccountStateResult } from "../../services/engine/accountTypes";

const MAX_INITIALS = 2;
const WORD_SEPARATOR = /\s+/;

/** Hasta dos iniciales del nombre; de un correo, la primera letra de lo que va antes de la «@». */
export function initialsOf(name: string): string {
  const words = name.split("@")[0]?.trim().split(WORD_SEPARATOR) ?? [];
  const letters = words.slice(0, MAX_INITIALS).map((word) => Array.from(word)[0] ?? "");
  return letters.join("").toLocaleUpperCase();
}

/** Lo que muestra el pie de la barra lateral; sin sesión (ni vencida con correo) no hay nada. */
export function summarizeAccount(
  state: AccountStateResult | null,
  i18n: Pick<I18n, "t">,
): AccountSummary | undefined {
  if (state?.status === "signed_in") return signedInSummary(state, i18n);
  if (state?.status === "expired") return expiredSummary(state, i18n);
  return undefined;
}

function signedInSummary(state: AccountStateResult, i18n: Pick<I18n, "t">) {
  if (!state.account) return undefined;
  const displayName = state.account.displayName?.trim();
  const name = displayName !== undefined && displayName !== "" ? displayName : state.account.email;
  const label = i18n.t("navigation.accountLabel", { name });
  return { initials: initialsOf(name), name, label };
}

function expiredSummary(state: AccountStateResult, i18n: Pick<I18n, "t">) {
  if (!state.email) return undefined;
  const note = i18n.t("navigation.accountExpired");
  const label = `${i18n.t("navigation.accountLabel", { name: state.email })}. ${note}`;
  return { initials: initialsOf(state.email), name: state.email, note, label };
}
