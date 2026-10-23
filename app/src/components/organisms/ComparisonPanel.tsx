import { useState } from "react";

import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { DiffValue } from "../molecules/DiffValue";
import { OccurrenceList, type OccurrenceView } from "../molecules/OccurrenceList";
import { SourceLine } from "../molecules/SourceLine";
import styles from "./ComparisonPanel.module.css";

export interface ComparedValue {
  readonly value: string;
  readonly positions: readonly number[];
  readonly fileName: string;
  /** Ubicación ya traducida («Página 1 · Encabezado»). */
  readonly location: string;
  /** Fragmento del documento donde aparece el valor. */
  readonly excerpt?: string | undefined;
  readonly occurrences: number;
  readonly files: number;
  /** Todas las apariciones, para «Ver las N apariciones». */
  readonly occurrenceList?: readonly OccurrenceView[] | undefined;
  /** «Abrir en página 1»: abre el archivo original con la aplicación del sistema. */
  readonly openLabel?: string | undefined;
  readonly onOpen?: (() => void) | undefined;
}

interface ComparisonPanelProps {
  readonly first: ComparedValue;
  /** Sin Valor B en las verificaciones de un solo dato (fecha imposible, campo vacío). */
  readonly second?: ComparedValue | undefined;
}

/** Valor A y Valor B lado a lado, cada uno con su origen (CLAUDE.md §7); o solo el A. */
export function ComparisonPanel({ first, second }: ComparisonPanelProps) {
  const { t } = useI18n();
  return (
    <div role="group" aria-label={t("alerts.compare")} className={styles.panel}>
      <ValueCard label="alerts.valueA" compared={first} />
      {second && (
        <>
          <span className={styles.arrow}>
            <Icon name="compare_arrows" size="lg" />
          </span>
          <ValueCard label="alerts.valueB" compared={second} />
        </>
      )}
    </div>
  );
}

function ValueCard({ label, compared }: { label: TranslationKey; compared: ComparedValue }) {
  const { t, tPlural } = useI18n();
  const occurrences = tPlural({ key: "alerts.occurrences", count: compared.occurrences });
  const files = tPlural({ key: "alerts.inFiles", count: compared.files });
  return (
    <section aria-label={t(label)} className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardLabel}>{t(label)}</span>
        <span className={styles.cardMeta}>{`${occurrences} ${files}`}</span>
      </div>
      <div className={styles.cardBody}>
        <DiffValue value={compared.value} positions={compared.positions} />
        <SourceLine fileName={compared.fileName} location={compared.location} />
        {compared.excerpt && <blockquote className={styles.excerpt}>{compared.excerpt}</blockquote>}
        <ValueActions compared={compared} />
      </div>
    </section>
  );
}

function ValueActions({ compared }: { compared: ComparedValue }) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const list = compared.occurrenceList ?? [];
  const hasMore = list.length > 1;
  if (!compared.onOpen && !hasMore) return null;
  return (
    <>
      <div className={styles.actions}>
        {compared.onOpen && (
          <Button size="md" icon="open_in_new" onClick={compared.onOpen}>
            {compared.openLabel}
          </Button>
        )}
        {hasMore && (
          <Button
            size="md"
            variant="tertiary"
            onClick={() => {
              setIsExpanded((current) => !current);
            }}
          >
            {isExpanded
              ? t("alerts.hideOccurrences")
              : t("alerts.showOccurrences", { count: list.length })}
          </Button>
        )}
      </div>
      {isExpanded && <OccurrenceList label={t("alerts.occurrenceListLabel")} occurrences={list} />}
    </>
  );
}
