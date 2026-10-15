import type { AlertRowData } from "../../components/organisms/AlertList";
import type { ComparedValue } from "../../components/organisms/ComparisonPanel";
import type { TranslationKey, TranslationParams } from "../../i18n/translate";
import type {
  AlertResult,
  AlertSideResult,
  EntityTypeValue,
  SourceLocationResult,
} from "../../services/engine/reviewTypes";

type Translate = (key: TranslationKey, params?: TranslationParams) => string;
type LocationDescriber = (location: SourceLocationResult, t: Translate) => string;

const FILE_SEPARATOR = ", ";

const ENTITY_TYPE_LABELS: Readonly<Record<EntityTypeValue, TranslationKey>> = {
  contract_id: "entityTypes.contract_id",
  tax_id: "entityTypes.tax_id",
  money: "entityTypes.money",
  date: "entityTypes.date",
  person_name: "entityTypes.person_name",
  organization_name: "entityTypes.organization_name",
  period: "entityTypes.period",
};

const ALERT_TITLES: Readonly<Record<EntityTypeValue, TranslationKey>> = {
  contract_id: "alertTitles.contract_id",
  tax_id: "alertTitles.tax_id",
  money: "alertTitles.money",
  date: "alertTitles.date",
  person_name: "alertTitles.person_name",
  organization_name: "alertTitles.organization_name",
  period: "alertTitles.period",
};

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

export function entityTypeLabel(alert: AlertResult, t: Translate): string {
  return t(ENTITY_TYPE_LABELS[alert.entityType]);
}

export function alertTitle(alert: AlertResult, t: Translate): string {
  return t(ALERT_TITLES[alert.entityType]);
}

function documentsOf(side: AlertSideResult): string[] {
  return [...new Set(side.occurrences.map((occurrence) => occurrence.document))];
}

export function toAlertRow(alert: AlertResult, t: Translate): AlertRowData {
  const files = [...new Set([...documentsOf(alert.first), ...documentsOf(alert.second)])];
  return {
    id: String(alert.number),
    number: alert.number,
    risk: alert.risk,
    title: alertTitle(alert, t),
    subtitle: `${entityTypeLabel(alert, t)} · ${files.join(FILE_SEPARATOR)}`,
    valueA: alert.first.value,
    valueB: alert.second.value,
    // Las decisiones llegan con la siguiente entrega; por ahora toda alerta nueva está pendiente.
    decision: "pending",
  };
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
  };
}
