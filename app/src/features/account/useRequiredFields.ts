import { useState } from "react";

import { useI18n } from "../../i18n/i18nContext";

export interface RequiredFields {
  /** El mensaje de un campo vacío, solo después de intentar enviar. */
  readonly errorFor: (value: string) => string | undefined;
  /** Marca el intento y dice si todos los valores están completos. */
  readonly check: (values: readonly string[]) => boolean;
}

export function useRequiredFields(): RequiredFields {
  const { t } = useI18n();
  const [isChecked, setChecked] = useState(false);
  return {
    errorFor: (value) => (isChecked && !value.trim() ? t("account.fields.required") : undefined),
    check: (values) => {
      setChecked(true);
      return values.every((value) => value.trim() !== "");
    },
  };
}
