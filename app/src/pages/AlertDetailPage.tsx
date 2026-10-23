import { Breadcrumb } from "../components/molecules/Breadcrumb";
import { Tabs } from "../components/molecules/Tabs";
import { CompactAlertList } from "../components/organisms/CompactAlertList";
import { ListDetailLayout } from "../components/templates/ListDetailLayout";
import { decidedCount, decisionStateOf } from "../features/alerts/alertDecisions";
import { filesOf } from "../features/alerts/alertFilters";
import { AlertDetailView } from "../features/alerts/AlertDetailView";
import { alertTitle } from "../features/alerts/alertPresentation";
import styles from "../features/alerts/AlertViews.module.css";
import { DecisionFeedback } from "../features/alerts/DecisionFeedback";
import type { ResultsTab } from "../features/alerts/resultsViewContext";
import { useAlertDecisions } from "../features/alerts/useAlertDecisions";
import { useDecisionShortcuts } from "../features/alerts/useDecisionShortcuts";
import { useOpenDocument } from "../features/alerts/useOpenDocument";
import { useI18n } from "../i18n/i18nContext";
import type { ReviewResult } from "../services/engine/reviewTypes";
import { alertSides } from "../features/alerts/alertSides";

interface AlertDetailPageProps {
  readonly review: ReviewResult;
  readonly number: number;
  readonly onOpenTab: (tab: ResultsTab) => void;
  readonly onOpenAlert: (number: number) => void;
  readonly onCloseReview: () => void;
}

/** Detalle de una alerta real: lista de la sesión a la izquierda y la alerta a la derecha. */
export function AlertDetailPage({
  review,
  number,
  onOpenTab,
  onOpenAlert,
  onCloseReview,
}: AlertDetailPageProps) {
  const { t, tPlural } = useI18n();
  const decisions = useAlertDecisions();
  const opener = useOpenDocument(review.session.id, decisions.notice);
  const alert = review.alerts.find((item) => item.number === number);
  const total = review.alerts.length;
  useDecisionShortcuts({
    alertNumber: alert?.number,
    decisions,
    onNext: () => {
      if (number < total) onOpenAlert(number + 1);
    },
    onPrevious: () => {
      if (number > 1) onOpenAlert(number - 1);
    },
  });
  if (!alert) return null;

  const header = (
    <div className={styles.headerBar}>
      <div className={styles.grow}>
        <Breadcrumb
          items={[
            {
              id: "session",
              label: review.session.name,
              onSelect: () => {
                onOpenTab("alerts");
              },
            },
            { id: "file", label: filesOf(alert)[0] ?? "", isMonospace: true },
            { id: "alert", label: t("alertDetail.label", { number }) },
          ]}
        />
      </div>
      <Tabs
        label={t("results.tabsLabel")}
        selectedId="alerts"
        tabs={[
          { id: "alerts", label: t("results.tabs.alerts"), count: total },
          { id: "files", label: t("results.tabs.files"), count: review.documents.length },
          { id: "decisions", label: t("results.tabs.decisions"), count: decidedCount(review) },
        ]}
        onSelect={(id) => {
          onOpenTab(id as ResultsTab);
        }}
      />
    </div>
  );
  const items = review.alerts.map((item) => {
    const state = decisionStateOf(review, item.number);
    return {
      number: item.number,
      risk: item.risk,
      title: alertTitle(item, t),
      values: alertSides(item)
        .map((side) => side.value)
        .join(" · "),
      state: t(`decision.${state}`),
      isPending: state === "pending",
    };
  });
  return (
    <>
      <ListDetailLayout
        header={header}
        list={
          <CompactAlertList
            summary={tPlural({ key: "results.alertCount", count: total })}
            items={items}
            currentNumber={number}
            onSelect={onOpenAlert}
          />
        }
        detail={
          <AlertDetailView
            review={review}
            alert={alert}
            decisions={decisions}
            opener={opener}
            onOpenAlert={onOpenAlert}
            onCloseReview={onCloseReview}
          />
        }
      />
      <DecisionFeedback decisions={decisions} />
    </>
  );
}
