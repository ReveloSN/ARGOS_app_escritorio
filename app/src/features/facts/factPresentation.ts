import type { I18n } from "../../i18n/i18nContext";
import type { FactResult, PendingFactResult } from "../../services/engine/factTypes";
import { entityTypeLabel } from "../alerts/alertPresentation";
import { appearanceDocuments, isRetired, topRisk, type FactRow } from "./factRows";

export type StatusTone = "high" | "medium" | "clear" | "muted";

/** Lo que muestra una fila de la tabla, ya traducido (mockup Expediente). */
export interface RowPresentation {
  readonly name: string;
  readonly type: string;
  readonly value: string;
  readonly isPending: boolean;
  readonly isRetired: boolean;
  readonly confirmed: string;
  readonly statusIcon: string;
  readonly statusLabel: string;
  readonly statusTone: StatusTone;
}

type Texts = Pick<I18n, "t" | "tPlural" | "format">;

const RISK_ICONS = { high: "report", medium: "warning", low: "info" } as const;

type Status = Pick<RowPresentation, "statusIcon" | "statusLabel" | "statusTone">;

function status(statusIcon: string, statusLabel: string, statusTone: StatusTone): Status {
  return { statusIcon, statusLabel, statusTone };
}

function factStatus(fact: FactResult, { t, tPlural }: Texts): Status {
  const risk = topRisk(fact);
  if (isRetired(fact)) return status("block", t("facts.notCompared"), "muted");
  if (!risk) return status("check", t("facts.noContradictions"), "clear");
  const label = tPlural({ key: "facts.contradictedBy", count: fact.contradictions.length });
  return status(RISK_ICONS[risk], label, risk === "high" ? "high" : "medium");
}

function factPresentation(fact: FactResult, texts: Texts): RowPresentation {
  const { t, format } = texts;
  const retired = isRetired(fact);
  return {
    name: fact.label,
    type: entityTypeLabel(fact.entityType, t),
    value: retired ? t("facts.retiredValue", { value: fact.value }) : fact.value,
    isPending: false,
    isRetired: retired,
    confirmed: retired ? t("facts.retired") : format.date(new Date(fact.confirmedAt)),
    ...factStatus(fact, texts),
  };
}

function pendingPresentation(pending: PendingFactResult, { t, format }: Texts): RowPresentation {
  const type = entityTypeLabel(pending.entityType, t);
  return {
    name: type,
    type,
    value: t("facts.pendingValue", { values: format.list(pending.values) }),
    isPending: true,
    isRetired: false,
    confirmed: "—",
    ...status("warning", t("facts.differentValues"), "medium"),
  };
}

export function rowPresentation(row: FactRow, texts: Texts): RowPresentation {
  return row.kind === "fact"
    ? factPresentation(row.fact, texts)
    : pendingPresentation(row.pending, texts);
}

/** Por qué ningún documento contradice el dato: retirado, reglas, otras formas y coincidencias. */
export function agreementNotes(fact: FactResult, { t, tPlural, format }: Texts): string[] {
  if (isRetired(fact)) return [t("facts.notes.retired")];
  const rules = fact.accepted.map((item) =>
    t("facts.notes.rule", { value: item.value, date: format.date(new Date(item.ruleCreatedAt)) }),
  );
  const variants = fact.variants.map((item) => t("facts.notes.variant", { ...item }));
  const count = appearanceDocuments(fact).length;
  const matches = count
    ? tPlural({ key: "facts.notes.matches", count })
    : t("facts.notes.notFound");
  return [...rules, ...variants, matches];
}
