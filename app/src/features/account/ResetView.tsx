import { useState } from "react";

import { TextField } from "../../components/atoms/TextField";
import { useI18n } from "../../i18n/i18nContext";
import { useAccount } from "./accountContext";
import styles from "./AccountGate.module.css";
import { GateForm } from "./GateForm";
import type { GateViewProps } from "./gateTypes";
import { PasswordField } from "./PasswordField";
import { useRequiredFields } from "./useRequiredFields";

/** El código del correo y la contraseña nueva. Nunca dice si el correo tiene cuenta. */
export function ResetView(props: GateViewProps) {
  const { t } = useI18n();
  const { actions } = useAccount();
  const { email, setEmail } = props;
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const required = useRequiredFields();
  const submit = () => {
    if (!required.check([email, code, password])) return;
    const form = { email: email.trim(), code: code.trim(), password };
    props.form.run(() => actions.confirmReset(form));
  };
  return (
    <GateForm
      {...props}
      submitLabel="account.actions.reset"
      busyLabel="account.actions.resetting"
      onSubmit={submit}
    >
      <p className={styles.note}>{t("account.notes.reset")}</p>
      <TextField
        label={t("account.fields.email")}
        value={email}
        onChange={setEmail}
        type="email"
        autoComplete="username"
        inputMode="email"
        error={required.errorFor(email)}
      />
      <TextField
        label={t("account.fields.code")}
        hint={t("account.fields.codeHint")}
        value={code}
        onChange={setCode}
        autoComplete="one-time-code"
        inputMode="numeric"
        autoFocus={props.autoFocus}
        error={required.errorFor(code)}
      />
      <PasswordField
        label={t("account.fields.newPassword")}
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        error={required.errorFor(password)}
      />
      <button
        type="button"
        className={styles.link}
        disabled={props.form.isBusy}
        onClick={() => {
          props.go("signIn");
        }}
      >
        {t("account.actions.backToSignIn")}
      </button>
    </GateForm>
  );
}
