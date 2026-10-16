import { useState } from "react";

import { Breadcrumb } from "../components/molecules/Breadcrumb";
import { StepIndicator } from "../components/molecules/StepIndicator";
import { WizardLayout } from "../components/templates/WizardLayout";
import { FileSelectionStep } from "../features/review/FileSelectionStep";
import { ReadConfirmationStep } from "../features/review/ReadConfirmationStep";
import { ReadingProgressPanel } from "../features/review/ReadingProgressPanel";
import { ReadSummaryAside, SessionNameAside } from "../features/review/ReviewAside";
import { useReview } from "../features/review/reviewContext";
import { useStartReview } from "../features/review/useStartReview";
import { ConfirmationFooter, SelectionFooter } from "../features/review/WizardFooters";
import { useI18n } from "../i18n/i18nContext";
import styles from "./Page.module.css";

interface NewReviewPageProps {
  readonly onCancel: () => void;
  readonly onReviewed: () => void;
}

/** Wizard: Cargar → Confirmar lectura → Revisar (los resultados reales de la revisión). */
export function NewReviewPage({ onCancel, onReviewed }: NewReviewPageProps) {
  const { t } = useI18n();
  const { discardReview } = useReview();
  const review = useStartReview();
  const [files, setFiles] = useState<readonly File[]>([]);
  const [name, setName] = useState("");
  const [isNameMissing, setIsNameMissing] = useState(false);
  const { documents, reading } = review;

  const analyze = () => {
    setIsNameMissing(!name.trim());
    if (name.trim()) review.start(name.trim(), files);
  };
  const backToSelection = () => {
    discardReview();
    review.reset();
  };
  const readCount = (documents ?? []).filter((document) => document.status === "read").length;

  const header = (
    <>
      <Breadcrumb
        items={[
          { id: "home", label: t("navigation.home"), onSelect: onCancel },
          { id: "new", label: t("newReview.title") },
        ]}
      />
      <h1 className={styles.title}>{t("newReview.title")}</h1>
      <StepIndicator
        steps={[
          t("newReview.steps.load"),
          t("newReview.steps.confirm"),
          t("newReview.steps.review"),
        ]}
        currentIndex={documents ? 1 : 0}
      />
    </>
  );

  if (documents) {
    return (
      <WizardLayout
        header={header}
        content={<ReadConfirmationStep documents={documents} onReplace={backToSelection} />}
        aside={<ReadSummaryAside documents={documents} />}
        footer={
          <ConfirmationFooter
            readCount={readCount}
            unreadCount={documents.length - readCount}
            onCancel={() => {
              discardReview();
              onCancel();
            }}
            onBack={backToSelection}
            onContinue={onReviewed}
          />
        }
      />
    );
  }
  return (
    <WizardLayout
      header={header}
      content={
        reading ? (
          <ReadingProgressPanel reading={reading} />
        ) : (
          <FileSelectionStep
            files={files}
            hasFailed={review.hasFailed}
            onAdd={(added) => {
              setFiles((current) => [...current, ...added]);
            }}
            onRemove={(index) => {
              setFiles((current) => current.filter((_, position) => position !== index));
            }}
            onRetry={analyze}
          />
        )
      }
      aside={
        <SessionNameAside
          name={name}
          isNameMissing={isNameMissing && !name.trim()}
          onNameChange={setName}
        />
      }
      footer={
        <SelectionFooter
          fileCount={files.length}
          isReading={reading !== null}
          onCancel={onCancel}
          onAnalyze={analyze}
        />
      }
    />
  );
}
