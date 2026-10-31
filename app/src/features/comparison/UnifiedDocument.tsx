import type { Ref, UIEvent } from "react";

import { Icon } from "../../components/atoms/Icon";
import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import type { ChangeResult, PairComparisonResult } from "../../services/engine/comparisonTypes";
import { describeLocation } from "../alerts/alertPresentation";
import styles from "./Compare.module.css";
import {
  unifiedParagraphs,
  type UnifiedMarkKind,
  type UnifiedParagraph,
  type UnifiedRun,
} from "./unifiedParagraphs";

interface UnifiedDocumentProps {
  readonly pair: PairComparisonResult;
  /** Los cambios que quedan a la vista después de los filtros. */
  readonly changes: readonly ChangeResult[];
  readonly selected: number | undefined;
  readonly onSelect: (number: number) => void;
  readonly scrollRef: Ref<HTMLDivElement>;
  readonly onScroll: (event: UIEvent<HTMLDivElement>) => void;
}

type RunProps = Pick<UnifiedDocumentProps, "selected" | "onSelect"> & { readonly run: UnifiedRun };

// Elementos semánticos: los lectores de pantalla anuncian «eliminado» e «insertado».
const MARK_ELEMENTS: Readonly<Record<UnifiedMarkKind, "del" | "ins">> = {
  removed: "del",
  added: "ins",
};

const MARK_STYLES: Readonly<Record<UnifiedMarkKind, string>> = {
  removed: styles.unifiedRemoved ?? "",
  added: styles.unifiedAdded ?? "",
};

/** Los caracteres que difieren van en negrita: 4857 contra 4587 se ve en «85» y «58», sin leer ambos. */
function MarkText({ run }: { readonly run: UnifiedRun }) {
  const { core, text } = run;
  if (!core) return <>{text}</>;
  return (
    <>
      {text.slice(0, core.start)}
      <strong className={styles.unifiedCore}>{text.slice(core.start, core.end)}</strong>
      {text.slice(core.end)}
    </>
  );
}

function Run({ run, selected, onSelect }: RunProps) {
  if (!run.mark || run.changeNumber === undefined) return <>{run.text}</>;
  const number = run.changeNumber;
  const Mark = MARK_ELEMENTS[run.mark];
  return (
    <span
      className={styles.markTarget}
      data-change={number}
      onClick={() => {
        onSelect(number);
      }}
    >
      <Mark
        data-selected={selected === number}
        className={joinClassNames(
          styles.unifiedMark,
          MARK_STYLES[run.mark],
          run.isHighRisk && styles.highRisk,
          run.isData && styles.unifiedData,
          selected === number && styles.unifiedSelected,
        )}
      >
        <MarkText run={run} />
      </Mark>
    </span>
  );
}

/** En el sitio que dejó un párrafo movido: una línea que dice dónde quedó. */
function MovedAway({ paragraph }: { readonly paragraph: UnifiedParagraph }) {
  const { t } = useI18n();
  const destination = paragraph.moved?.change.second;
  return (
    <p className={styles.movedAway} data-change={paragraph.moved?.change.number}>
      <Icon name="swap_vert" size="xs" />
      {t("comparison.unified.movedTo", {
        location: destination ? describeLocation(destination.location, t) : "",
      })}
    </p>
  );
}

/** Un solo texto: lo eliminado de A tachado en gris y lo agregado de B subrayado en el acento. */
export function UnifiedDocument(props: UnifiedDocumentProps) {
  const { t } = useI18n();
  const paragraphs = unifiedParagraphs(props.pair, props.changes);
  return (
    <section aria-label={t("comparison.unified.label")} className={styles.unified}>
      <div ref={props.scrollRef} className={styles.unifiedBody} onScroll={props.onScroll}>
        {paragraphs.map((paragraph) =>
          paragraph.moved && !paragraph.moved.isDestination ? (
            <MovedAway key={paragraph.key} paragraph={paragraph} />
          ) : (
            <p
              key={paragraph.key}
              className={paragraph.moved ? styles.movedParagraph : styles.paragraph}
            >
              {paragraph.runs.map((run, index) => (
                <Run key={index} run={run} selected={props.selected} onSelect={props.onSelect} />
              ))}
            </p>
          ),
        )}
      </div>
    </section>
  );
}
