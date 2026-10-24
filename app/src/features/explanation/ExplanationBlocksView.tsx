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

export function ExplanationBlocksView({ blocks }: { readonly blocks: ExplanationBlocks }) {
  const { t } = useI18n();
  return (
    <dl className={styles.blocks}>
      {BLOCKS.map((block) => (
        <div key={block.field} className={styles.block}>
          <dt className={styles.blockTitle}>{t(block.title)}</dt>
          <dd className={styles.blockText}>{blocks[block.field]}</dd>
        </div>
      ))}
    </dl>
  );
}
