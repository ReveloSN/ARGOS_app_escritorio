import { useState } from "react";

import { TextField } from "../../components/atoms/TextField";
import { useI18n } from "../../i18n/i18nContext";
import { useAccount } from "./accountContext";
import { GateForm } from "./GateForm";
import styles from "./AccountGate.module.css";
import type { GateViewProps } from "./gateTypes";
import { PasswordField } from "./PasswordField";
import { useRequiredFields } from "./useRequiredFields";

/** Entrar con correo y contraseña. La contraseña vive solo en esta vista y se borra al dejarla. */
export function SignInView(props: GateViewProps) {
  const { t } = useI18n();
  const { actions } = useAccount();
  const { email, setEmail } = props;
  const [password, setPassword] = useState("");
  const required = useRequiredFields();
  const submit = () => {
    if (!required.check([email, password])) return;
    props.form.run(() => actions.signIn({ email: email.trim(), password }));
  };
  return (
    <GateForm
      {...props}
      submitLabel="account.actions.signIn"
      busyLabel="account.actions.signingIn"
      onSubmit={submit}
    >
      <TextField
        label={t("account.fields.email")}
        value={email}
        onChange={setEmail}
        type="email"
        autoComplete="username"
        inputMode="email"
        autoFocus={props.autoFocus}
        error={required.errorFor(email)}
      />
      <PasswordField
        label={t("account.fields.password")}
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        error={required.errorFor(password)}
      />
      <button
        type="button"
        className={styles.link}
        disabled={props.form.isBusy}
        onClick={() => {
          props.go("recover");
        }}
      >
        {t("account.actions.forgot")}
      </button>
    </GateForm>
  );
}
