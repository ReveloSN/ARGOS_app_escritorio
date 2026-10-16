import type { DecisionState } from "../../components/atoms/DecisionTag";
import type { OccurrenceView } from "../../components/molecules/OccurrenceList";
import type { AlertRowData } from "../../components/organisms/AlertList";
import type { ComparedValue } from "../../components/organisms/ComparisonPanel";
import type { TranslationKey, TranslationParams } from "../../i18n/translate";
import type {
  AlertResult,
  AlertSideResult,
  EntityTypeValue,
  SourceLocationResult,
} from "../../services/engine/reviewTypes";
import { filesOf } from "./alertFilters";

export type Translate = (key: TranslationKey, params?: TranslationParams) => string;
type LocationDescriber = (location: SourceLocationResult, t: Translate) => string;

const FILE_SEPARATOR = ", ";

// Cada tipo de ubicación usa sus propios campos; el motor garantiza la forma de cada uno.
const LOCATION_DESCRIPTIONS: Readonly<Record<SourceLocationResult["kind"], LocationDescriber>> = {
  page: (location, t) => t("origin.page", location),
  paragraph: (location, t) => t("origin.paragraph", location),
  table_cell: (location, t) => t("origin.tableCell", location),
  sheet_cell: (location, t) => t("origin.sheetCell", location),
  email_part: (location, t) =>
    t("part" in location && location.part === "subject" ? "origin.subject" : "origin.body"),
  line: (location, t) => t("origin.line", location),
};

export function describeLocation(location: SourceLocationResult, t: Translate): string {
  return LOCATION_DESCRIPTIONS[location.kind](location, t);
}

export function entityTypeLabel(entityType: EntityTypeValue, t: Translate): string {
  return t(`entityTypes.${entityType}`);
}

export function alertTitle(alert: AlertResult, t: Translate): string {
  return t(`alertTitles.${alert.entityType}`);
}

function documentsOf(side: AlertSideResult): string[] {
  return [...new Set(side.occurrences.map((occurrence) => occurrence.document))];
}

export function toAlertRow(
  alert: AlertResult,
  t: Translate,
  decision: DecisionState,
): AlertRowData {
  return {
    id: String(alert.number),
    number: alert.number,
    risk: alert.risk,
    title: alertTitle(alert, t),
    subtitle: `${entityTypeLabel(alert.entityType, t)} · ${filesOf(alert).join(FILE_SEPARATOR)}`,
    valueA: alert.first.value,
    valueB: alert.second.value,
    decision,
  };
}

/** Texto en el que busca «Buscar en alertas»: título, tipo, valores, archivos y número. */
export function alertSearchText(alert: AlertResult, t: Translate): string {
  const row = toAlertRow(alert, t, "pending");
  return [String(alert.number), row.title, row.subtitle, row.valueA, row.valueB].join(" ");
}

export function toOccurrenceViews(side: AlertSideResult, t: Translate): OccurrenceView[] {
  return side.occurrences.map((occurrence) => ({
    fileName: occurrence.document,
    location: describeLocation(occurrence.location, t),
    excerpt: occurrence.excerpt,
  }));
}

/** «Abrir en página 1» si el valor está en una página; si no, «Abrir archivo». */
export function openLabelFor(side: AlertSideResult, t: Translate): string {
  const location = side.occurrences[0]?.location;
  return location?.kind === "page"
    ? t("alertDetail.openAtPage", { page: location.page })
    : t("alertDetail.openFile");
}

export function toComparedValue(
  side: AlertSideResult,
  positions: readonly number[],
  t: Translate,
): ComparedValue {
  const [origin] = side.occurrences;
  return {
    value: side.value,
    positions,
    fileName: origin?.document ?? "",
    location: origin ? describeLocation(origin.location, t) : "",
    excerpt: origin?.excerpt,
    occurrences: side.occurrences.length,
    files: documentsOf(side).length,
    occurrenceList: toOccurrenceViews(side, t),
  };
}
