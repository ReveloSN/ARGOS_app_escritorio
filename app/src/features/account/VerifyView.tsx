import { useState } from "react";

import { TextField } from "../../components/atoms/TextField";
import { useI18n } from "../../i18n/i18nContext";
import { useAccount } from "./accountContext";
import styles from "./AccountGate.module.css";
import { GateForm } from "./GateForm";
import type { GateViewProps } from "./gateTypes";
import { useRequiredFields } from "./useRequiredFields";

type Resending = "none" | "sending" | "sent";

/** Confirmar el correo con el código de 6 a 10 dígitos que llegó a la bandeja, o pedir otro. */
export function VerifyView(props: GateViewProps) {
  const { t } = useI18n();
  const { actions } = useAccount();
  const [code, setCode] = useState("");
  const [resending, setResending] = useState<Resending>("none");
  const required = useRequiredFields();
  const { form } = props;
  const email = props.email.trim();
  const submit = () => {
    if (!required.check([code])) return;
    setResending("none");
    form.run(() => actions.verify({ email, code: code.trim() }));
  };
  const resend = () => {
    setResending("sending");
    form.run(async () => {
      await actions.resendCode(email);
      setResending("sent");
    }, resend);
  };
  // Con el código rechazado, pedir otro ya es el botón del aviso.
  const isResendInAlert = form.problem === "invalid_code";
  return (
    <GateForm
      {...props}
      submitLabel="account.actions.verify"
      busyLabel={
        resending === "sending" ? "account.actions.sendingCode" : "account.actions.verifying"
      }
      onSubmit={submit}
      onResend={resend}
    >
      <div>
        <p className={styles.note}>{t("account.notes.verify", { email })}</p>
        <p role="status" className={styles.note}>
          {resending === "sent" ? t("account.notes.resent") : ""}
        </p>
      </div>
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
      <div className={styles.links}>
        {!isResendInAlert && (
          <button type="button" className={styles.link} disabled={form.isBusy} onClick={resend}>
            {t("account.actions.resendCode")}
          </button>
        )}
        <button
          type="button"
          className={styles.link}
          disabled={form.isBusy}
          onClick={() => {
            props.go("signIn");
          }}
        >
          {t("account.actions.backToSignIn")}
        </button>
      </div>
    </GateForm>
  );
}
