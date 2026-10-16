import type { I18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import type { HistoryRecordResult } from "../../services/engine/historyTypes";
import { entityTypeLabel } from "../alerts/alertPresentation";

type CsvContext = Pick<I18n, "t" | "format">;

// Excel usa «;» como separador donde la coma es el separador decimal (es-CO) y «,» en en-US.
const SEMICOLON = ";";
const COMMA = ",";
const LINE_BREAK = "\r\n";
const QUOTE = '"';
// Un monto con decimales revela el separador decimal del formato regional elegido.
const DECIMAL_SAMPLE = 1.5;

const COLUMNS: readonly TranslationKey[] = [
  "csv.session",
  "csv.sessionDate",
  "csv.alert",
  "csv.risk",
  "csv.type",
  "csv.valueA",
  "csv.valueB",
  "csv.decision",
  "csv.correctValue",
  "csv.decidedAt",
];

function quote(value: string): string {
  return `${QUOTE}${value.replaceAll(QUOTE, QUOTE + QUOTE)}${QUOTE}`;
}

export function csvSeparator(i18n: CsvContext): string {
  return i18n.format.amount(DECIMAL_SAMPLE, "USD").includes(COMMA) ? SEMICOLON : COMMA;
}

function recordRow(record: HistoryRecordResult, i18n: CsvContext): string[] {
  const { t, format } = i18n;
  const correct = record.correctSide === "first" ? record.firstValue : record.secondValue;
  return [
    record.sessionName,
    format.dateTime(new Date(record.sessionCreatedAt)),
    String(record.alertNumber),
    t(`risk.${record.risk}`),
    entityTypeLabel(record.entityType, t),
    record.firstValue,
    record.secondValue,
    t(`decision.${record.decision ?? "pending"}`),
    record.correctSide ? correct : "",
    record.decidedAt ? format.dateTime(new Date(record.decidedAt)) : "",
  ];
}

/** Registro del historial en CSV: una fila por alerta, con su decisión o «Pendiente». */
export function buildHistoryCsv(records: readonly HistoryRecordResult[], i18n: CsvContext): string {
  const separator = csvSeparator(i18n);
  const rows = [COLUMNS.map((column) => i18n.t(column)), ...records.map((r) => recordRow(r, i18n))];
  return rows.map((row) => row.map(quote).join(separator)).join(LINE_BREAK) + LINE_BREAK;
}
