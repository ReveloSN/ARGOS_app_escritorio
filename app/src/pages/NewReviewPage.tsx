import { useState } from "react";

import { Breadcrumb } from "../components/molecules/Breadcrumb";
import { StepIndicator } from "../components/molecules/StepIndicator";
import { WizardLayout } from "../components/templates/WizardLayout";
import { useEngineServices } from "../features/engine/EngineServicesContext";
import { FileSelectionStep } from "../features/review/FileSelectionStep";
import { ReadConfirmationStep } from "../features/review/ReadConfirmationStep";
import { ReadSummaryAside, SessionNameAside } from "../features/review/ReviewAside";
import { useReview } from "../features/review/reviewContext";
import { ConfirmationFooter, SelectionFooter } from "../features/review/WizardFooters";
import { useI18n } from "../i18n/i18nContext";
import type { DocumentReadResult } from "../services/engine/reviewTypes";
import styles from "./Page.module.css";

interface NewReviewPageProps {
  readonly onCancel: () => void;
  readonly onReviewed: () => void;
}

/** Wizard: Cargar → Confirmar lectura → Revisar (los resultados reales de la revisión). */
export function NewReviewPage({ onCancel, onReviewed }: NewReviewPageProps) {
  const { t } = useI18n();
  const { reviewStarter } = useEngineServices();
  const { showReview, discardReview } = useReview();
  const [files, setFiles] = useState<readonly File[]>([]);
  const [name, setName] = useState("");
  const [isNameMissing, setIsNameMissing] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [documents, setDocuments] = useState<readonly DocumentReadResult[] | null>(null);

  const analyze = async () => {
    setIsNameMissing(!name.trim());
    if (!name.trim()) return;
    setIsReading(true);
    setHasFailed(false);
    try {
      const review = await reviewStarter.startReview({ name: name.trim(), files });
      showReview(review);
      setDocuments(review.documents);
    } catch {
      setHasFailed(true);
    } finally {
      setIsReading(false);
    }
  };
  const backToSelection = () => {
    discardReview();
    setDocuments(null);
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
        <FileSelectionStep
          files={files}
          hasFailed={hasFailed}
          onAdd={(added) => {
            setFiles((current) => [...current, ...added]);
          }}
          onRemove={(index) => {
            setFiles((current) => current.filter((_, position) => position !== index));
          }}
          onRetry={() => void analyze()}
        />
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
          isReading={isReading}
          onCancel={onCancel}
          onAnalyze={() => void analyze()}
        />
      }
    />
  );
}
