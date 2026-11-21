import { Button } from "../components/atoms/Button";
import { NEW_REVIEW_SHORTCUT } from "../components/organisms/sidebarSections";
import { AssistantEye } from "../features/assistant/AssistantEye";
import { useAssistantStatus } from "../features/assistant/useAssistantStatus";
import { useReopenComparison } from "../features/comparison/useReopenComparison";
import { RecentComparisons } from "../features/session/RecentComparisons";
import { ReviewOverview } from "../features/session/ReviewOverview";
import { isEmptySnapshot, type SessionSnapshot } from "../features/session/sessionSnapshot";
import { useSavedSessionCount } from "../features/session/useSavedSessionCount";
import { useSessionSnapshot } from "../features/session/useSessionSnapshot";
import { useI18n } from "../i18n/i18nContext";
import type { TranslationKey } from "../i18n/translate";
import styles from "./HomePage.module.css";

interface HomePageProps {
  readonly onNewReview: () => void;
  readonly onCompare: () => void;
  readonly onContinueReview: () => void;
  readonly onOpenHistory: () => void;
}

/** Los pasos reales de Nueva revisión, con el mismo nombre que en el asistente de carga. */
const REVIEW_STEPS: readonly { readonly title: TranslationKey; readonly text: TranslationKey }[] = [
  { title: "newReview.steps.load", text: "home.steps.load" },
  { title: "newReview.steps.confirm", text: "home.steps.confirm" },
  { title: "newReview.steps.review", text: "home.steps.review" },
];

function EmptySummary({ savedCount }: { readonly savedCount: number | undefined }) {
  const { t, tPlural } = useI18n();
  if (savedCount === undefined) return <div aria-busy="true" />;
  const hasSaved = savedCount > 0;
  return (
    <>
      <h1 className={styles.title}>{t(hasSaved ? "home.saved.title" : "home.title")}</h1>
      <p className={styles.description}>
        {hasSaved
          ? tPlural({ key: "home.saved.description", count: savedCount })
          : t("home.description")}
      </p>
    </>
  );
}

function ReviewSteps() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="home-steps" className={styles.steps}>
      <h2 id="home-steps" className={styles.stepsTitle}>
        {t("home.steps.label")}
      </h2>
      <ol className={styles.stepList}>
        {REVIEW_STEPS.map((step) => (
          <li key={step.title} className={styles.step}>
            <span className={styles.stepName}>{t(step.title)}</span>
            <span className={styles.stepText}>{t(step.text)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

interface ActionsProps extends Pick<HomePageProps, "onNewReview" | "onCompare" | "onOpenHistory"> {
  readonly isEmpty: boolean;
  readonly hasSavedReviews: boolean;
}

function HomeActions({
  isEmpty,
  hasSavedReviews,
  onNewReview,
  onCompare,
  onOpenHistory,
}: ActionsProps) {
  const { t } = useI18n();
  return (
    <div className={styles.actions}>
      <Button
        variant={isEmpty ? "primary" : "secondary"}
        icon="add"
        shortcut={NEW_REVIEW_SHORTCUT}
        onClick={onNewReview}
      >
        {t("navigation.newReview")}
      </Button>
      {hasSavedReviews && <Button onClick={onOpenHistory}>{t("home.saved.openHistory")}</Button>}
      <Button onClick={onCompare}>{t("home.compareVersions")}</Button>
    </div>
  );
}

function ActiveSession({
  snapshot,
  onContinueReview,
  onCompare,
}: Pick<HomePageProps, "onContinueReview" | "onCompare"> & { snapshot: SessionSnapshot }) {
  const reopen = useReopenComparison();
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
 * directos; el estado vacío solo aparece si de verdad no hay documentos ni comparaciones. La
 * mascota acompaña sin repetir el estado: ese texto vive en la barra lateral.
 */
export function HomePage(props: HomePageProps) {
  const { t } = useI18n();
  const assistant = useAssistantStatus();
  const snapshot = useSessionSnapshot();
  const savedCount = useSavedSessionCount(snapshot.review?.id);
  const isEmpty = isEmptySnapshot(snapshot);

  return (
    <div className={styles.home}>
      <div className={styles.intro}>
        <div className={isEmpty ? styles.companion : styles.companionCompact}>
          <AssistantEye state={assistant.status.eye} size={isEmpty ? "lg" : "md"} />
        </div>
        <div className={styles.workspace}>
          {isEmpty ? (
            <EmptySummary savedCount={savedCount} />
          ) : (
            <ActiveSession
              snapshot={snapshot}
              onContinueReview={props.onContinueReview}
              onCompare={props.onCompare}
            />
          )}
          <HomeActions
            isEmpty={isEmpty}
            hasSavedReviews={isEmpty && (savedCount ?? 0) > 0}
            onNewReview={props.onNewReview}
            onCompare={props.onCompare}
            onOpenHistory={props.onOpenHistory}
          />
          <span className={styles.note}>{t("home.note")}</span>
        </div>
      </div>
      {isEmpty && <ReviewSteps />}
    </div>
  );
}
