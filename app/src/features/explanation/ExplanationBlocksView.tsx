import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import type { ExplanationBlocks } from "./explanationBlocks";
import styles from "./ExplanationPanel.module.css";

// Títulos fijos: la persona sabe dónde mirar sin leer el resto.
const BLOCKS: readonly {
  readonly field: keyof Omit<ExplanationBlocks, "summary">;
  readonly title: TranslationKey;
}[] = [
  { field: "changed", title: "explainPanel.changed" },
  { field: "why", title: "explainPanel.why" },
  { field: "todo", title: "explainPanel.todo" },
];

interface ExplanationBlocksViewProps {
  readonly blocks: ExplanationBlocks;
  /** Título y texto en una misma fila, para que el detalle no empuje la decisión fuera de la pantalla. */
  readonly isCompact: boolean;
}

export function ExplanationBlocksView({ blocks, isCompact }: ExplanationBlocksViewProps) {
  const { t } = useI18n();
  return (
    <dl className={joinClassNames(styles.blocks, isCompact && styles.blocksCompact)}>
      {BLOCKS.map((block) => (
        <div key={block.field} className={styles.block}>
          <dt className={styles.blockTitle}>{t(block.title)}</dt>
          <dd className={styles.blockText}>{blocks[block.field]}</dd>
        </div>
      ))}
    </dl>
  );
}
