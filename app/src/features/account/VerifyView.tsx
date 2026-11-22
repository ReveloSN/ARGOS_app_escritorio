import { useState } from "react";

import { TextField } from "../../components/atoms/TextField";
import { useI18n } from "../../i18n/i18nContext";
import { useAccount } from "./accountContext";
import styles from "./AccountGate.module.css";
import { GateForm } from "./GateForm";
import type { GateViewProps } from "./gateTypes";
import { useRequiredFields } from "./useRequiredFields";

/** Confirmar el correo con el código de 6 a 10 dígitos que llegó a la bandeja. */
export function VerifyView(props: GateViewProps) {
  const { t } = useI18n();
  const { actions } = useAccount();
  const [code, setCode] = useState("");
  const required = useRequiredFields();
  const submit = () => {
    if (!required.check([code])) return;
    props.form.run(() => actions.verify({ email: props.email.trim(), code: code.trim() }));
  };
  return (
    <GateForm
      {...props}
      submitLabel="account.actions.verify"
      busyLabel="account.actions.verifying"
      onSubmit={submit}
    >
      <p className={styles.note}>{t("account.notes.verify", { email: props.email.trim() })}</p>
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
