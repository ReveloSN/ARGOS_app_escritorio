import type { I18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import type { AlertResult, DifferenceKindValue } from "../../services/engine/reviewTypes";

export interface DifferenceDescription {
  readonly description: string;
  /** Los caracteres que cambian: «8 ↔ 5» o «0 → 5». */
  readonly change: string | undefined;
  readonly isHighlighted: boolean;
}

type DescriptionContext = Pick<I18n, "t" | "tPlural" | "format">;

const SWAPPED_POSITIONS = 2;

// Diferencias que no se explican por posiciones de caracteres, sino por el significado del valor.
const KIND_DESCRIPTIONS: Readonly<Partial<Record<DifferenceKindValue, TranslationKey>>> = {
  date_component: "difference.dateComponent",
  day_month_swap: "difference.dayMonthSwap",
  similar_name: "difference.similarName",
  format_only: "difference.formatOnly",
};

/** «Diferencia: posiciones 2 y 3 intercambiadas · 8 ↔ 5», según cómo difieren los valores. */
export function describeDifference(
  alert: AlertResult,
  i18n: DescriptionContext,
): DifferenceDescription {
  const isHighlighted = alert.highlightPositions.length > 0;
  const kindKey = KIND_DESCRIPTIONS[alert.differenceKind];
  if (kindKey) return { description: i18n.t(kindKey), change: undefined, isHighlighted };
  if (!isHighlighted) {
    return { description: i18n.t("difference.valuesDiffer"), change: undefined, isHighlighted };
  }
  const isSwap =
    alert.differenceKind === "transposition" &&
    alert.highlightPositions.length === SWAPPED_POSITIONS;
  return isSwap ? describeSwap(alert, i18n) : describeChangedCharacters(alert, i18n);
}

function characterAt(value: string, position: number): string {
  // Las posiciones del motor son base 1 y cuentan puntos de código, como Array.from.
  return Array.from(value)[position - 1] ?? "";
}

function describeSwap(alert: AlertResult, i18n: DescriptionContext): DifferenceDescription {
  const positions = alert.highlightPositions;
  return {
    description: i18n.t("difference.transposition", {
      positions: i18n.format.list(positions.map(String)),
    }),
    change: positions.map((position) => characterAt(alert.first.value, position)).join(" ↔ "),
    isHighlighted: true,
  };
}

function describeChangedCharacters(
  alert: AlertResult,
  i18n: DescriptionContext,
): DifferenceDescription {
  const positions = alert.highlightPositions;
  const changes = positions.map(
    (position) =>
      `${characterAt(alert.first.value, position)} → ${characterAt(alert.second.value, position)}`,
  );
  const description = i18n.tPlural({
    key: "difference.characterChange",
    count: positions.length,
    params: { positions: i18n.format.list(positions.map(String)) },
  });
  return { description, change: changes.join(", "), isHighlighted: true };
}
