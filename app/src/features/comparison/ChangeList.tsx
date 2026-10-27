import { useI18n } from "../../i18n/i18nContext";
import type { ChangeResult } from "../../services/engine/comparisonTypes";
import type { DecisionResult } from "../../services/engine/reviewTypes";
import { ChangeItem } from "./ChangeItem";
import styles from "./Compare.module.css";

interface ChangeListProps {
  /** Los cambios después de ignorar los de forma. */
  readonly shown: readonly ChangeResult[];
  readonly visible: readonly ChangeResult[];
  readonly decisions: readonly DecisionResult[];
  readonly selected: number | undefined;
  /** Número de cambio → documento contra el que ocurre; solo en «contra todos». */
  readonly againstByChange?: ReadonlyMap<number, string> | undefined;
  readonly onSelect: (number: number) => void;
}

/** Sin cambios a la vista: o no hay diferencias, o los filtros ocultan las que hay. */
function EmptyChanges({ hasHiddenChanges }: { readonly hasHiddenChanges: boolean }) {
  const { t } = useI18n();
  if (!hasHiddenChanges) {
    return <p className={styles.emptyList}>{t("comparison.list.noDifferences")}</p>;
  }
  return (
    <>
      <p className={styles.emptyList}>{t("comparison.list.empty")}</p>
      <p className={styles.emptyList}>{t("comparison.list.emptyHint")}</p>
    </>
  );
}

/** Lista de cambios (J / K para navegar); sus filtros están en «Opciones». */
export function ChangeList(props: ChangeListProps) {
  const { t } = useI18n();
  return (
    <div className={styles.listPanel}>
      <div className={styles.listHeader}>
        <span className={styles.listTitle}>{t("comparison.list.title")}</span>
        <span className={styles.listCount}>
          {t("comparison.list.count", { visible: props.visible.length, total: props.shown.length })}
        </span>
        <span className={styles.listHint}>{t("comparison.list.navigate")}</span>
      </div>
      <ul aria-label={t("comparison.list.title")} className={styles.items}>
        {props.visible.map((change) => (
          <ChangeItem
            key={change.number}
            change={change}
            decision={props.decisions.find((decision) => decision.alertNumber === change.number)}
            isSelected={props.selected === change.number}
            against={props.againstByChange?.get(change.number)}
            onSelect={props.onSelect}
          />
        ))}
      </ul>
      {!props.visible.length && <EmptyChanges hasHiddenChanges={props.shown.length > 0} />}
    </div>
  );
}
