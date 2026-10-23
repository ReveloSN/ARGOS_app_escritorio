import type { Ref, UIEvent } from "react";

import { DiffMark } from "../../components/atoms/DiffMark";
import { Icon } from "../../components/atoms/Icon";
import { useI18n } from "../../i18n/i18nContext";
import { describeLocation } from "../alerts/alertPresentation";
import type { TranslationKey } from "../../i18n/translate";
import styles from "./Compare.module.css";
import type { PanelSegment, PanelSide, TextRun } from "./segmentRuns";

const SIDE_LABELS: Readonly<Record<PanelSide, TranslationKey>> = {
  first: "comparison.sideA",
  second: "comparison.sideB",
};
const LEGENDS: Readonly<Record<PanelSide, TranslationKey>> = {
  first: "comparison.panel.legendFirst",
  second: "comparison.panel.legendSecond",
};
// El otro lado del cambio movido: en A se dice dónde quedó en B, y al revés.
const OTHER_SIDE: Readonly<Record<PanelSide, PanelSide>> = { first: "second", second: "first" };

export interface DocumentPanelProps {
  readonly side: PanelSide;
  readonly document: string;
  readonly segments: readonly PanelSegment[];
  readonly selected: number | undefined;
  readonly onSelect: (number: number) => void;
  readonly scrollRef: Ref<HTMLDivElement>;
  readonly onScroll: (event: UIEvent<HTMLDivElement>) => void;
}

function Run({
  run,
  selected,
  onSelect,
}: { run: TextRun } & Pick<DocumentPanelProps, "selected" | "onSelect">) {
  if (!run.mark || run.changeNumber === undefined) return <>{run.text}</>;
  const number = run.changeNumber;
  return (
    <span
      className={styles.markTarget}
      data-change={number}
      onClick={() => {
        onSelect(number);
      }}
    >
      <DiffMark kind={run.mark} isSelected={selected === number}>
        {run.text}
      </DiffMark>
      <sup className={styles.markNumber}>{number}</sup>
    </span>
  );
}

function MovedNote({
  item,
  side,
  onSelect,
}: {
  item: PanelSegment;
  side: PanelSide;
  onSelect: (number: number) => void;
}) {
  const { t } = useI18n();
  const moved = item.moved;
  if (!moved) return null;
  const other = moved[OTHER_SIDE[side]];
  return (
    <button
      type="button"
      className={styles.movedNote}
      data-change={moved.number}
      onClick={() => {
        onSelect(moved.number);
      }}
    >
      <Icon name="swap_vert" size="xs" />
      {t("comparison.panel.moved", {
        side: t(SIDE_LABELS[OTHER_SIDE[side]]),
        location: other ? describeLocation(other.location, t) : "",
      })}
    </button>
  );
}

/** Un documento completo con sus diferencias marcadas dentro del texto. */
export function DocumentPanel(props: DocumentPanelProps) {
  const { t } = useI18n();
  return (
    <section aria-label={props.document} className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.sideBadge}>{t(SIDE_LABELS[props.side])}</span>
        <span className={styles.documentName}>{props.document}</span>
        <span className={styles.legend}>{t(LEGENDS[props.side])}</span>
      </div>
      <div ref={props.scrollRef} className={styles.panelBody} onScroll={props.onScroll}>
        {props.segments.map((item) => (
          <p
            key={item.segment.position}
            className={item.moved ? styles.movedParagraph : styles.paragraph}
          >
            <MovedNote item={item} side={props.side} onSelect={props.onSelect} />
            {item.runs.map((run, index) => (
              <Run key={index} run={run} selected={props.selected} onSelect={props.onSelect} />
            ))}
          </p>
        ))}
      </div>
    </section>
  );
}
