import { useState } from "react";

import { TextField } from "../../components/atoms/TextField";
import { useI18n } from "../../i18n/i18nContext";
import { useAccount } from "./accountContext";
import { GateForm } from "./GateForm";
import type { GateViewProps } from "./gateTypes";
import { PasswordField } from "./PasswordField";
import { useRequiredFields } from "./useRequiredFields";

/** Crear la cuenta: nombre opcional, correo y contraseña. Con confirmación, sigue el código. */
export function SignUpView(props: GateViewProps) {
  const { t } = useI18n();
  const { actions } = useAccount();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(props.email);
  const [password, setPassword] = useState("");
  const required = useRequiredFields();
  const create = async () => {
    const displayName = name.trim();
    const form = { email: email.trim(), password, ...(displayName ? { displayName } : {}) };
    const { needsConfirmation } = await actions.signUp(form);
    if (needsConfirmation) props.go("verify", form.email);
  };
  const submit = () => {
    if (required.check([email, password])) props.form.run(create);
  };
  return (
    <GateForm
      {...props}
      email={email}
      submitLabel="account.actions.signUp"
      busyLabel="account.actions.signingUp"
      onSubmit={submit}
    >
      <TextField
        label={t("account.fields.name")}
        hint={t("account.fields.nameHint")}
        value={name}
        onChange={setName}
        autoComplete="name"
        autoFocus={props.autoFocus}
      />
      <TextField
        label={t("account.fields.email")}
        value={email}
        onChange={setEmail}
        type="email"
        autoComplete="username"
        inputMode="email"
        error={required.errorFor(email)}
      />
      <PasswordField
        label={t("account.fields.password")}
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        error={required.errorFor(password)}
      />
    </GateForm>
  );
}
