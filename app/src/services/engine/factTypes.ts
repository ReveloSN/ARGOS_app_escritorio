/** Datos confirmados del expediente tal como los entrega el motor (engine/argus/api/schemas/facts.py). */

import type {
  DifferenceKindValue,
  EntityTypeValue,
  OccurrenceResult,
  RiskLevelValue,
} from "./reviewTypes";

export interface ContradictionResult {
  readonly value: string;
  readonly risk: RiskLevelValue;
  readonly differenceKind: DifferenceKindValue;
  readonly occurrences: readonly OccurrenceResult[];
}

/** Un valor distinto que no se marca por una regla «No alertar casos similares». */
export interface AcceptedValueResult {
  readonly value: string;
  readonly ruleCreatedAt: string;
  readonly occurrences: readonly OccurrenceResult[];
}

/** El mismo valor escrito de otra forma, aceptado como igual. */
export interface VariantResult {
  readonly value: string;
  readonly document: string;
}

export interface FactResult {
  readonly id: number;
  readonly label: string;
  readonly entityType: EntityTypeValue;
  readonly value: string;
  readonly confirmedAt: string;
  readonly retiredAt: string | null;
  readonly appearances: readonly OccurrenceResult[];
  readonly variants: readonly VariantResult[];
  readonly contradictions: readonly ContradictionResult[];
  readonly accepted: readonly AcceptedValueResult[];
}

/** Dos valores de los documentos sin un dato confirmado que diga cuál es el correcto. */
export interface PendingFactResult {
  readonly entityType: EntityTypeValue;
  readonly values: readonly string[];
}

export interface FactsResult {
  readonly facts: readonly FactResult[];
  readonly pending: readonly PendingFactResult[];
  readonly canUndo: boolean;
}

export interface FactInput {
  readonly label: string;
  readonly entityType: EntityTypeValue;
  readonly value: string;
}

/** Puerto de la interfaz para los datos confirmados; el cliente HTTP lo implementa. */
export interface FactGateway {
  listFacts(sessionId: string): Promise<FactsResult>;
  addFact(sessionId: string, fact: FactInput): Promise<FactsResult>;
  editFact(sessionId: string, factId: number, value: string): Promise<FactsResult>;
  retireFact(sessionId: string, factId: number): Promise<FactsResult>;
  restoreFact(sessionId: string, factId: number): Promise<FactsResult>;
  undoFact(sessionId: string): Promise<FactsResult>;
}
