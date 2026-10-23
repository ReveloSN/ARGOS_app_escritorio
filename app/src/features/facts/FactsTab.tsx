import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import type { ReviewResult } from "../../services/engine/reviewTypes";
import styles from "./Facts.module.css";
import { FactsWorkspace } from "./FactsWorkspace";
import { useCaseFileFacts } from "./useCaseFileFacts";

export interface FactsTabProps {
  readonly review: ReviewResult;
  /** «Agregar dato» del encabezado abre la fila nueva en la tabla. */
  readonly isAdding: boolean;
  readonly onAdd: () => void;
  readonly onAddDone: () => void;
}

/** Pestaña «Datos confirmados» del expediente: la fuente de verdad contra la que se compara. */
export function FactsTab(props: FactsTabProps) {
  const { t } = useI18n();
  const { query, changes } = useCaseFileFacts(props.review.session.id);
  if (query.state.status === "loading") {
    return (
      <p role="status" className={styles.loading}>
        {t("facts.loading")}
      </p>
    );
  }
  if (query.state.status === "failed") {
    return (
      <div className={styles.message}>
        <ErrorMessage
          tone="neutral"
          what={t("facts.loadFailed.what")}
          why={t("facts.loadFailed.why")}
          todo={t("facts.loadFailed.todo")}
          primaryAction={{ label: t("facts.loadFailed.retry"), onClick: query.reload }}
        />
      </div>
    );
  }
  return <FactsWorkspace {...props} result={query.state.data} changes={changes} />;
}
