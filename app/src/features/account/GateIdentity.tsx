import { ArgusEye } from "../../components/atoms/ArgusEye";
import { Button } from "../../components/atoms/Button";
import { ReticleMotif } from "../../components/atoms/ReticleMotif";
import { useI18n } from "../../i18n/i18nContext";
import { useAccount } from "./accountContext";
import styles from "./AccountGate.module.css";
import type { GateFormState } from "./useGateForm";

/** La identidad de ARGUS, el aviso de privacidad y «Continuar sin cuenta»: siempre juntos y a la vista. */
export function GateIdentity({ form }: { readonly form: GateFormState }) {
  const { t } = useI18n();
  const { actions } = useAccount();
  // Omitir no lleva datos: su reintento puede repetirse tal cual.
  const skip = () => {
    form.run(actions.skip, skip);
  };
  return (
    <aside className={styles.identity}>
      <ReticleMotif size="sm" className={styles.reticle} />
      <div className={styles.brand}>
        <ArgusEye state="logo" size="lg" />
        <span className={styles.name}>{t("app.name")}</span>
      </div>
      <p className={styles.heading}>{t("account.heading")}</p>
      <p className={styles.privacy}>{t("account.privacy")}</p>
      <Button disabled={form.isBusy} onClick={skip}>
        {t("account.skip")}
      </Button>
    </aside>
  );
}
