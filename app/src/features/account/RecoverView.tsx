import { useState } from "react";

import { TextField } from "../../components/atoms/TextField";
import { useI18n } from "../../i18n/i18nContext";
import { useAccount } from "./accountContext";
import styles from "./AccountGate.module.css";
import { GateForm } from "./GateForm";
import type { GateViewProps } from "./gateTypes";
import { useRequiredFields } from "./useRequiredFields";

/** Pedir el código de recuperación. Nunca dice si el correo tiene cuenta. */
export function RecoverView(props: GateViewProps) {
  const { t } = useI18n();
  const { actions } = useAccount();
  const [email, setEmail] = useState(props.email);
  const required = useRequiredFields();
  const request = async () => {
    await actions.requestReset(email.trim());
    props.go("reset", email.trim());
  };
  const submit = () => {
    if (required.check([email])) props.form.run(request);
  };
  return (
    <GateForm
      {...props}
      email={email}
      submitLabel="account.actions.sendCode"
      busyLabel="account.actions.sendingCode"
      onSubmit={submit}
    >
      <p className={styles.note}>{t("account.notes.recover")}</p>
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
      <div className={styles.links}>
        <button
          type="button"
          className={styles.link}
          onClick={() => {
            props.go("reset", email.trim());
          }}
        >
          {t("account.actions.haveCode")}
        </button>
        <button
          type="button"
          className={styles.link}
          onClick={() => {
            props.go("signIn", email.trim());
          }}
        >
          {t("account.actions.backToSignIn")}
        </button>
      </div>
    </GateForm>
  );
}
