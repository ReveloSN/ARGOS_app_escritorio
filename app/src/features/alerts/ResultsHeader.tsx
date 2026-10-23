import { Button } from "../../components/atoms/Button";
import { Breadcrumb } from "../../components/molecules/Breadcrumb";
import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { Tabs } from "../../components/molecules/Tabs";
import { useI18n } from "../../i18n/i18nContext";
import type { ReviewResult } from "../../services/engine/reviewTypes";
import { ReviewSummaryLine } from "../review/ReviewSummaryLine";
import type { ReviewCloser } from "../review/useCloseReview";
import { decidedCount, isReadOnly } from "./alertDecisions";
import styles from "./ResultsHeader.module.css";
import { useResultsView, type ResultsTab } from "./resultsViewContext";

interface ResultsHeaderProps {
  readonly review: ReviewResult;
  readonly closer: ReviewCloser;
  /** «Agregar dato», solo en la pestaña «Datos confirmados» de un expediente abierto. */
  readonly onAddFact: () => void;
  /** «Generar informe»: también en una revisión cerrada, que se puede documentar. */
  readonly onReport: () => void;
}

/** Encabezado del expediente: ruta, nombre, resumen, «Agregar dato», «Cerrar revisión» y pestañas. */
export function ResultsHeader({ review, closer, onAddFact, onReport }: ResultsHeaderProps) {
  const { t } = useI18n();
  const { tab, setTab } = useResultsView();
  const tabs = [
    { id: "facts", label: t("results.tabs.facts") },
    { id: "alerts", label: t("results.tabs.alerts"), count: review.alerts.length },
    { id: "files", label: t("results.tabs.files"), count: review.documents.length },
    { id: "decisions", label: t("results.tabs.decisions"), count: decidedCount(review) },
  ];
  const showAlerts = () => {
    setTab("alerts");
  };
  return (
    <div className={styles.header}>
      <Breadcrumb
        items={[
          { id: "session", label: review.session.name, onSelect: showAlerts },
          { id: "tab", label: tabs.find((item) => item.id === tab)?.label ?? "" },
        ]}
      />
      <div className={styles.titleRow}>
        <div className={styles.heading}>
          <h1 className={styles.title}>{review.session.name}</h1>
          <ReviewSummaryLine review={review} />
        </div>
        <Button size="md" icon="description" onClick={onReport}>
          {t("report.generate")}
        </Button>
        {!isReadOnly(review) && tab === "facts" && (
          <Button variant="primary" size="md" icon="add" onClick={onAddFact}>
            {t("facts.add")}
          </Button>
        )}
        {!isReadOnly(review) && (
          <Button size="md" onClick={closer.close}>
            {t("results.closeReview")}
          </Button>
        )}
      </div>
      {closer.hasFailed && (
        <ErrorMessage
          tone="neutral"
          what={t("closeFailed.what")}
          why={t("closeFailed.why")}
          todo={t("closeFailed.todo")}
          primaryAction={{ label: t("closeFailed.retry"), onClick: closer.close }}
        />
      )}
      <Tabs
        label={t("results.tabsLabel")}
        tabs={tabs}
        selectedId={tab}
        onSelect={(id) => {
          setTab(id as ResultsTab);
        }}
      />
    </div>
  );
}
