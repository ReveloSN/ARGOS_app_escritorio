import { Button } from "../components/atoms/Button";
import { ReticleMotif } from "../components/atoms/ReticleMotif";
import { NEW_REVIEW_SHORTCUT } from "../components/organisms/sidebarSections";
import { AssistantEye } from "../features/assistant/AssistantEye";
import { useAssistantStatus } from "../features/assistant/useAssistantStatus";
import { EngineUnavailableMessage } from "../features/engine/EngineUnavailableMessage";
import { useEngineStatus } from "../features/engine/useEngineStatus";
import { useReopenComparison } from "../features/comparison/useReopenComparison";
import { RecentComparisons } from "../features/session/RecentComparisons";
import { ReviewOverview } from "../features/session/ReviewOverview";
import { isEmptySnapshot, type SessionSnapshot } from "../features/session/sessionSnapshot";
import { useSavedSessionCount } from "../features/session/useSavedSessionCount";
import { useSessionSnapshot } from "../features/session/useSessionSnapshot";
import { useI18n } from "../i18n/i18nContext";
import styles from "./HomePage.module.css";

interface HomePageProps {
  readonly onNewReview: () => void;
  readonly onCompare: () => void;
  readonly onContinueReview: () => void;
  readonly onOpenHistory: () => void;
}

function EmptySummary({ savedCount }: { readonly savedCount: number }) {
  const { t, tPlural } = useI18n();
  if (savedCount === 0) {
    return (
      <>
        <h1 className={styles.title}>{t("home.title")}</h1>
        <p className={styles.description}>{t("home.description")}</p>
      </>
    );
  }
  return (
    <>
      <h1 className={styles.title}>{t("home.saved.title")}</h1>
      <p className={styles.description}>
        {tPlural({ key: "home.saved.description", count: savedCount })}
      </p>
    </>
  );
}

function SessionSummary({
  snapshot,
  savedCount,
  onContinueReview,
  onCompare,
}: Pick<HomePageProps, "onContinueReview" | "onCompare"> & {
  snapshot: SessionSnapshot;
  savedCount: number;
}) {
  const reopen = useReopenComparison();
  if (isEmptySnapshot(snapshot)) return <EmptySummary savedCount={savedCount} />;
  return (
    <>
      {snapshot.review && <ReviewOverview review={snapshot.review} onContinue={onContinueReview} />}
      <RecentComparisons
        comparisons={snapshot.comparisons}
        onOpen={(comparisonId) => {
          reopen(comparisonId);
          onCompare();
        }}
      />
    </>
  );
}

/**
 * Inicio: el estado de la sesión activa (la misma fuente que la barra lateral) con accesos
 * directos; el estado vacío solo aparece si de verdad no hay documentos ni comparaciones.
 */
export function HomePage({
  onNewReview,
  onCompare,
  onContinueReview,
  onOpenHistory,
}: HomePageProps) {
  const { t } = useI18n();
  const engineStatus = useEngineStatus();
  const assistant = useAssistantStatus();
  const snapshot = useSessionSnapshot();
  const savedCount = useSavedSessionCount(snapshot.review?.id);
  const hasSavedReviewsToOpen = isEmptySnapshot(snapshot) && savedCount > 0;

  return (
    <div className={styles.home}>
      {engineStatus === "stopped" && (
        <div className={styles.notice}>
          <EngineUnavailableMessage />
        </div>
      )}
      <div className={styles.stage}>
        <ReticleMotif size="lg" className={styles.reticle} />
        <div className={styles.content}>
          <AssistantEye
            state={assistant.status.eye}
            size="lg"
            label={t("assistant.label", { status: assistant.text })}
          />
          <SessionSummary
            snapshot={snapshot}
            savedCount={savedCount}
            onContinueReview={onContinueReview}
            onCompare={onCompare}
          />
          <div className={styles.actions}>
            <Button
              variant={isEmptySnapshot(snapshot) ? "primary" : "secondary"}
              shortcut={NEW_REVIEW_SHORTCUT}
              onClick={onNewReview}
            >
              {t("navigation.newReview")}
            </Button>
            {hasSavedReviewsToOpen && (
              <Button onClick={onOpenHistory}>{t("home.saved.openHistory")}</Button>
            )}
            <Button onClick={onCompare}>{t("home.compareVersions")}</Button>
          </div>
          <span className={styles.note}>{t("home.note")}</span>
        </div>
      </div>
    </div>
  );
}
