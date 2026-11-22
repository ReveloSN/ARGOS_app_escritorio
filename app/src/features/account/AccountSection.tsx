import { Button } from "../../components/atoms/Button";
import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import type { AccountStateResult } from "../../services/engine/accountTypes";
import settings from "../settings/Settings.module.css";
import { hasAccountFeature, useAccount } from "./accountContext";
import styles from "./AccountSection.module.css";
import { AccountProblemMessage } from "./AccountProblemMessage";
import { useGateForm, type GateFormState } from "./useGateForm";

function ExpiredNotice({ state, form }: { state: AccountStateResult; form: GateFormState }) {
  const { t } = useI18n();
  const { openGate, actions } = useAccount();
  return (
    <ErrorMessage
      tone="neutral"
      what={t("settings.account.expired.what")}
      why={t("settings.account.expired.why")}
      todo={t("settings.account.expired.todo")}
      primaryAction={{
        label: t("settings.account.expired.action"),
        onClick: () => {
          openGate(state.email);
        },
      }}
      secondaryAction={{
        label: t(form.isBusy ? "settings.account.signingOut" : "settings.account.signOut"),
        onClick: () => {
          form.run(actions.signOut);
        },
      }}
    />
  );
}

function SignedInDetails({ state, form }: { state: AccountStateResult; form: GateFormState }) {
  const { t } = useI18n();
  const { actions } = useAccount();
  return (
    <>
      <dl className={styles.facts}>
        <dt>{t("settings.account.email")}</dt>
        <dd>{state.account?.email}</dd>
        <dt>{t("settings.account.name")}</dt>
        <dd>{state.account?.displayName ?? t("settings.account.noName")}</dd>
      </dl>
      {state.isOffline && <p className={settings.description}>{t("settings.account.offline")}</p>}
      {!state.isPersisted && (
        <p className={settings.description}>{t("settings.account.notPersisted")}</p>
      )}
      <div className={settings.inlineRow}>
        <Button
          size="md"
          disabled={form.isBusy}
          onClick={() => {
            form.run(actions.signOut);
          }}
        >
          {t(form.isBusy ? "settings.account.signingOut" : "settings.account.signOut")}
        </Button>
      </div>
    </>
  );
}

function SignedOutDetails() {
  const { t } = useI18n();
  const { openGate } = useAccount();
  return (
    <>
      <p className={settings.description}>{t("settings.account.signedOut")}</p>
      <div className={settings.inlineRow}>
        <Button
          size="md"
          onClick={() => {
            openGate();
          }}
        >
          {t("settings.account.signIn")}
        </Button>
      </div>
    </>
  );
}

function Details({ state, form }: { state: AccountStateResult; form: GateFormState }) {
  if (state.status === "signed_in") return <SignedInDetails state={state} form={form} />;
  if (state.status === "expired") return <ExpiredNotice state={state} form={form} />;
  return <SignedOutDetails />;
}

/**
 * Ajustes › Cuenta: quién está dentro y cómo salir. El fallo de «Cerrar sesión» se queda aunque la
 * sesión ya se haya cerrado en memoria; vencida, pide volver a entrar o deja quitarla.
 */
export function AccountSection() {
  const { state, actions } = useAccount();
  const form = useGateForm();
  if (!state || !hasAccountFeature(state)) return null;
  return (
    <>
      <Details state={state} form={form} />
      {form.problem && (
        <AccountProblemMessage
          problem={form.problem}
          onAction={(action) => {
            if (action === "retry") form.run(actions.signOut);
            else form.dismiss();
          }}
        />
      )}
    </>
  );
}
