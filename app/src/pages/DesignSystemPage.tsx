import { useState, type ReactNode } from "react";

import { Button } from "../components/atoms/Button";
import { DecisionTag } from "../components/atoms/DecisionTag";
import { ProgressBar } from "../components/atoms/ProgressBar";
import { RiskTag } from "../components/atoms/RiskTag";
import { EmptyState } from "../components/molecules/EmptyState";
import { ErrorMessage } from "../components/molecules/ErrorMessage";
import { FilterChip } from "../components/molecules/FilterChip";
import { SearchField } from "../components/molecules/SearchField";
import { StepIndicator } from "../components/molecules/StepIndicator";
import { AlertList } from "../components/organisms/AlertList";
import { ComparisonPanel } from "../components/organisms/ComparisonPanel";
import { UploadZone } from "../components/organisms/UploadZone";
import { AppearanceSwitch } from "../features/settings/theme/AppearanceSwitch";
import { useI18n } from "../i18n/i18nContext";
import styles from "./DesignSystemPage.module.css";
import * as samples from "./designSystemSamples";

const IGNORE = () => undefined;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

/** Galería del design system con datos reales de los mockups (verificación visual y de temas). */
export function DesignSystemPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("4587");
  const [selectedId, setSelectedId] = useState("3");

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t("designSystem.title")}</h1>
        <AppearanceSwitch />
      </div>
      <Section title={t("designSystem.atoms")}>
        <div className={styles.row}>
          <Button variant="primary">{t("designSystem.reviewSample")}</Button>
          <Button>{t("upload.choose")}</Button>
          <Button variant="tertiary">{t("actions.undo")}</Button>
          <Button variant="primary" disabled>
            {t("designSystem.reviewSample")}
          </Button>
        </div>
        <div className={styles.row}>
          <RiskTag level="high" variant="long" />
          <RiskTag level="medium" variant="long" />
          <RiskTag level="low" variant="long" />
          <DecisionTag state="pending" />
          <DecisionTag state="correct" />
          <DecisionTag state="error" />
          <DecisionTag state="ignored" />
        </div>
        <ProgressBar value={0.64} label={t("engine.status.analyzing", { done: 3, total: 5 })} />
      </Section>
      <Section title={t("designSystem.molecules")}>
        <div className={styles.row}>
          <SearchField
            label={t("actions.search")}
            value={query}
            onChange={setQuery}
            onSearch={IGNORE}
          />
          <FilterChip label={samples.SAMPLE_FILTERS.active} active onRemove={IGNORE} />
          <FilterChip label={samples.SAMPLE_FILTERS.inactive} onOpen={IGNORE} />
        </div>
        <StepIndicator steps={samples.SAMPLE_STEPS} currentIndex={1} />
        <ErrorMessage
          tone="inline"
          what={samples.SAMPLE_ERROR.what}
          why={samples.SAMPLE_ERROR.why}
          todo={samples.SAMPLE_ERROR.todo}
          primaryAction={{ label: samples.SAMPLE_ERROR.primary, onClick: IGNORE }}
        />
      </Section>
      <Section title={t("designSystem.organisms")}>
        <AlertList rows={samples.SAMPLE_ROWS} selectedId={selectedId} onSelect={setSelectedId} />
        <ComparisonPanel first={samples.SAMPLE_VALUE_A} second={samples.SAMPLE_VALUE_B} />
        <UploadZone onFilesSelected={IGNORE} onPasteText={IGNORE} />
        <div className={styles.empty}>
          <EmptyState
            icon="folder_open"
            title={samples.SAMPLE_EMPTY.title}
            description={samples.SAMPLE_EMPTY.description}
            note={samples.SAMPLE_EMPTY.note}
            actions={<Button variant="primary">{t("navigation.newReview")}</Button>}
          />
        </div>
      </Section>
    </div>
  );
}
