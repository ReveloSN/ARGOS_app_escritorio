import type { DecisionState } from "../../components/atoms/DecisionTag";
import type {
  AlertResult,
  EntityTypeValue,
  RiskLevelValue,
} from "../../services/engine/reviewTypes";
import { includesFolded } from "../search/foldForSearch";

/** Filtros combinables de Resultados (búsqueda faceted); una faceta vacía no filtra. */
export interface AlertFilters {
  readonly risks: readonly RiskLevelValue[];
  readonly types: readonly EntityTypeValue[];
  readonly files: readonly string[];
  readonly states: readonly DecisionState[];
  readonly query: string;
}

export type FacetName = "risks" | "types" | "files" | "states";

export const FACET_NAMES: readonly FacetName[] = ["risks", "types", "files", "states"];

export const NO_FILTERS: AlertFilters = { risks: [], types: [], files: [], states: [], query: "" };

/** Lo que se sabe de cada alerta para filtrarla: su estado y el texto en el que se busca. */
export interface FilterableAlert {
  readonly alert: AlertResult;
  readonly state: DecisionState;
  readonly searchText: string;
}

export function filesOf(alert: AlertResult): string[] {
  const occurrences = [...alert.first.occurrences, ...alert.second.occurrences];
  return [...new Set(occurrences.map((occurrence) => occurrence.document))];
}

export function activeFacetCount(filters: AlertFilters): number {
  return FACET_NAMES.filter((facet) => filters[facet].length > 0).length;
}

function accepts<Value>(selected: readonly Value[], value: Value): boolean {
  return selected.length === 0 || selected.includes(value);
}

function acceptsFiles(selected: readonly string[], alert: AlertResult): boolean {
  return selected.length === 0 || filesOf(alert).some((file) => selected.includes(file));
}

export function matchesFilters(item: FilterableAlert, filters: AlertFilters): boolean {
  const { alert } = item;
  return (
    accepts(filters.risks, alert.risk) &&
    accepts(filters.types, alert.entityType) &&
    acceptsFiles(filters.files, alert) &&
    accepts(filters.states, item.state) &&
    includesFolded(item.searchText, filters.query)
  );
}

/** Cambia una opción de una faceta: la agrega si no estaba y la quita si estaba. */
export function toggleOption(
  filters: AlertFilters,
  facet: FacetName,
  option: string,
): AlertFilters {
  const current: readonly string[] = filters[facet];
  const next = current.includes(option)
    ? current.filter((value) => value !== option)
    : [...current, option];
  return { ...filters, [facet]: next };
}
