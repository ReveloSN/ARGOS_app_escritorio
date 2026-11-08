import { useId, type ReactNode } from "react";

import { SegmentedControl } from "../../components/molecules/SegmentedControl";
import { useI18n } from "../../i18n/i18nContext";
import type { ChangeResult } from "../../services/engine/comparisonTypes";
import type { DecisionResult } from "../../services/engine/reviewTypes";
import { importantCount, type ChangeFilters } from "./changeFilters";
import { ChangeItem } from "./ChangeItem";
import { decisionTotals } from "./reviewTotals";
import { ReviewComplete } from "./ReviewComplete";
import styles from "./Compare.module.css";

interface ChangeListProps {
  /** Los cambios después de ignorar los de forma. */
  readonly shown: readonly ChangeResult[];
  /** Los que se ven: los de riesgo alto primero. */
  readonly visible: readonly ChangeResult[];
  readonly decisions: readonly DecisionResult[];
  readonly selected: number | undefined;
  readonly filters: ChangeFilters;
  readonly onFilters: (filters: ChangeFilters) => void;
  /** Número de cambio → documento contra el que ocurre; solo en «contra todos». */
  readonly againstByChange?: ReadonlyMap<number, string> | undefined;
  readonly onSelect: (number: number) => void;
  /** Detalle del cambio elegido, en una zona independiente de la lista. */
  readonly renderDetail: (change: ChangeResult) => ReactNode;
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

const ALL = "all";
const IMPORTANT = "important";

/** Un solo control para ver todos los cambios o solo los importantes, cada uno con su conteo. */
function ImportanceControl(props: Pick<ChangeListProps, "shown" | "filters" | "onFilters">) {
  const { t } = useI18n();
  const options = [
    { value: ALL, label: `${t("comparison.list.all")} ${String(props.shown.length)}` },
    {
      value: IMPORTANT,
      label: `${t("comparison.list.important")} ${String(importantCount(props.shown))}`,
    },
  ];
  return (
    <SegmentedControl
      label={t("comparison.list.filterLabel")}
      options={options}
      value={props.filters.isImportantOnly ? IMPORTANT : ALL}
      onChange={(value) => {
        props.onFilters({ ...props.filters, isImportantOnly: value === IMPORTANT });
      }}
    />
  );
}

interface ListHeaderProps {
  readonly hasHighRisk: boolean;
  readonly done: number;
  readonly total: number;
}

/** Título, qué significa el punto rojo, cuántos cambios van decididos y la pista de teclado. */
function ListHeader({ hasHighRisk, done, total }: ListHeaderProps) {
  const { t } = useI18n();
  return (
    <div className={styles.listHeader}>
      <h2 className={styles.listTitle}>{t("comparison.list.title")}</h2>
      {hasHighRisk && (
        <span className={styles.riskLegend}>
          <span aria-hidden="true" className={styles.riskDot} />
          {t("risk.highLong")}
        </span>
      )}
      {total > 0 && done < total && (
        <span className={styles.listProgress}>{t("comparison.list.decided", { done, total })}</span>
      )}
      <span className={styles.listHint}>{t("comparison.list.navigate")}</span>
    </div>
  );
}

/** Lista de cambios, uno por línea (J / K para navegar); los de riesgo alto van primero. */
export function ChangeList(props: ChangeListProps) {
  const { t } = useI18n();
  const detailId = useId();
  const selected = props.visible.find((change) => change.number === props.selected);
  const firstOther = props.visible.findIndex((change) => change.risk !== "high");
  const isDecided = (change: ChangeResult) =>
    props.decisions.some((decision) => decision.alertNumber === change.number);
  const done = props.visible.filter(isDecided).length;
  const isComplete = props.visible.length > 0 && done === props.visible.length;
  return (
    <div className={styles.listPanel}>
      <ListHeader
        hasHighRisk={firstOther !== 0 && props.visible.length > 0}
        done={done}
        total={props.visible.length}
      />
      {isComplete && <ReviewComplete totals={decisionTotals(props.visible, props.decisions)} />}
      <ImportanceControl {...props} />
      <ul aria-label={t("comparison.list.title")} className={styles.items}>
        {props.visible.map((change, index) => (
          <ChangeItem
            key={change.number}
            change={change}
            decision={props.decisions.find((decision) => decision.alertNumber === change.number)}
            isSelected={props.selected === change.number}
            startsOthers={index > 0 && index === firstOther}
            against={props.againstByChange?.get(change.number)}
            onSelect={props.onSelect}
            detailId={props.selected === change.number ? detailId : undefined}
          />
        ))}
      </ul>
      {selected && (
        <div id={detailId} className={styles.selectedDetail}>
          {props.renderDetail(selected)}
        </div>
      )}
      {!props.visible.length && <EmptyChanges hasHiddenChanges={props.shown.length > 0} />}
    </div>
  );
}
