import { useState } from "react";

import { Icon } from "../../components/atoms/Icon";
import { TextField } from "../../components/atoms/TextField";
import { useI18n } from "../../i18n/i18nContext";
import styles from "./AccountGate.module.css";

interface PasswordFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly autoComplete: "current-password" | "new-password";
  readonly error?: string | undefined;
}

/** Contraseña oculta, con un botón para verla un momento; al cambiar de vista se vuelve a ocultar. */
export function PasswordField({ label, value, onChange, autoComplete, error }: PasswordFieldProps) {
  const { t } = useI18n();
  const [isShown, setShown] = useState(false);
  return (
    <TextField
      label={label}
      value={value}
      onChange={onChange}
      type={isShown ? "text" : "password"}
      autoComplete={autoComplete}
      error={error}
      trailing={
        <button
          type="button"
          aria-label={t("account.fields.showPassword")}
          aria-pressed={isShown}
          className={styles.reveal}
          onClick={() => {
            setShown(!isShown);
          }}
        >
          <Icon name={isShown ? "visibility_off" : "visibility"} size="md" />
        </button>
      }
    />
  );
}
