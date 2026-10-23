import { Button } from "../../components/atoms/Button";
import { useI18n } from "../../i18n/i18nContext";
import styles from "./Facts.module.css";
import { AssistantEye } from "../assistant/AssistantEye";

interface FactsEmptyProps {
  /** Sin acción en una revisión cerrada, que es de solo lectura. */
  readonly onAdd: (() => void) | undefined;
}

/** «Aún no hay datos confirmados» (mockup Estados y mensajes, pantalla 07). */
export function FactsEmpty({ onAdd }: FactsEmptyProps) {
  const { t } = useI18n();
  return (
    <div className={styles.empty}>
      <AssistantEye state="doubt" size="lg" />
      <h2 className={styles.emptyTitle}>{t("facts.empty.title")}</h2>
      <p className={styles.emptyText}>{t("facts.empty.description")}</p>
      {onAdd && (
        <Button variant="primary" size="md" icon="add" onClick={onAdd}>
          {t("facts.add")}
        </Button>
      )}
    </div>
  );
}
