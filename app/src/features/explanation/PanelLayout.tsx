import type { ReactNode } from "react";

import { Icon } from "../../components/atoms/Icon";
import { useI18n } from "../../i18n/i18nContext";
import type { ExplanationBlocks } from "./explanationBlocks";
import { ExplanationBlocksView } from "./ExplanationBlocksView";
import styles from "./ExplanationPanel.module.css";
import { SideBySideValues } from "./SideBySideValues";
import type { SideBySide } from "./sideValues";

interface PanelLayoutProps {
  readonly blocks: ExplanationBlocks;
  /** «Posible cambio de significado»: la sugerencia de la IA local, en lenguaje claro. */
  readonly meaning: string | undefined;
  readonly values: SideBySide | undefined;
  /** El texto o la clasificación vienen de la IA: se rotula como sugerencia. */
  readonly isAiSuggestion: boolean;
  /** Es-correcto / Es-un-error / Ignorar, siempre debajo de la explicación. */
  readonly actions: ReactNode;
  readonly detail: ReactNode;
}

/** Orden fijo: frase resumen, los dos valores, tres bloques, decisión y «Ver detalle». */
export function PanelLayout(props: PanelLayoutProps) {
  const { t } = useI18n();
  const hasAiSuggestion = props.isAiSuggestion || props.meaning !== undefined;
  return (
    <section aria-label={t("explainPanel.label")} className={styles.panel}>
      <header className={styles.header}>
        {props.meaning && (
          <span className={styles.meaning}>
            <Icon name="auto_awesome" size="xs" />
            {props.meaning}
          </span>
        )}
        <h3 className={styles.summary}>{props.blocks.summary}</h3>
        {hasAiSuggestion && <span className={styles.aiNote}>{t("explainPanel.aiNote")}</span>}
      </header>
      {props.values && <SideBySideValues values={props.values} />}
      <ExplanationBlocksView blocks={props.blocks} />
      {props.actions}
      {props.detail}
    </section>
  );
}
