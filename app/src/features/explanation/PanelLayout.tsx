import type { ReactNode } from "react";

import { Icon } from "../../components/atoms/Icon";
import { useI18n } from "../../i18n/i18nContext";
import type { ExplanationBlocks } from "./explanationBlocks";
import { ExplanationBlocksView } from "./ExplanationBlocksView";
import styles from "./ExplanationPanel.module.css";
import { SideBySideValues } from "./SideBySideValues";
import type { SideBySide } from "./sideValues";

interface PanelLayoutProps {
  /** Cómo se anuncia el panel: de un cambio o de una alerta. */
  readonly label: string;
  readonly blocks: ExplanationBlocks;
  /** «Posible cambio de significado»: la sugerencia de la IA local, en lenguaje claro. */
  readonly meaning: string | undefined;
  readonly values: SideBySide | undefined;
  /** El texto o la clasificación vienen de la IA: se rotula como sugerencia. */
  readonly isAiSuggestion: boolean;
  /** Es-correcto / Es-un-error / Ignorar, siempre debajo de la explicación. */
  readonly actions: ReactNode;
  readonly detail: ReactNode;
  /** Comparar: los dos valores quedan plegados y los tres bloques en una línea cada uno. */
  readonly isCompact?: boolean | undefined;
}

/** Los dos valores; en el modo compacto se despliegan con un solo control, sin repetir el texto. */
function PanelValues({ values, isCompact }: { values: SideBySide; isCompact: boolean }) {
  const { t } = useI18n();
  if (!isCompact) return <SideBySideValues values={values} />;
  return (
    <details className={styles.valuesFold}>
      <summary className={styles.valuesToggle}>{t("explainPanel.valuesToggle")}</summary>
      <SideBySideValues values={values} />
    </details>
  );
}

/** En Comparar la decisión queda justo bajo la frase resumen y fija al pie mientras el detalle se lee. */
function ActionsDock({ children }: { readonly children: ReactNode }) {
  return <div className={styles.actionsDock}>{children}</div>;
}

/** Orden fijo: frase resumen, los dos valores, tres bloques, decisión y «Ver detalle». */
export function PanelLayout(props: PanelLayoutProps) {
  const { t } = useI18n();
  const hasAiSuggestion = props.isAiSuggestion || props.meaning !== undefined;
  const isCompact = props.isCompact ?? false;
  return (
    <section aria-label={props.label} className={styles.panel}>
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
      {isCompact && <ActionsDock>{props.actions}</ActionsDock>}
      {props.values && <PanelValues values={props.values} isCompact={isCompact} />}
      <ExplanationBlocksView blocks={props.blocks} isCompact={isCompact} />
      {!isCompact && props.actions}
      {props.detail}
    </section>
  );
}
