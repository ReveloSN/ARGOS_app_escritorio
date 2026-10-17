/** Ajustes del motor (engine/argus/api/schemas/preferences.py). */

import type { EntityTypeValue } from "./reviewTypes";

export type SensitivityValue = "strict" | "balanced" | "permissive";
export type ComparedCategoryValue = "identifiers" | "dates" | "amounts" | "names" | "periods";

export interface SuppressionRuleResult {
  readonly id: number;
  readonly entityType: EntityTypeValue;
  readonly firstLabel: string;
  readonly secondLabel: string;
  readonly createdAt: string;
}

export interface PreferencesUpdate {
  readonly sensitivity: SensitivityValue;
  readonly comparedCategories: readonly ComparedCategoryValue[];
  readonly hasRetentionLimit: boolean;
}

export interface PreferencesResult extends PreferencesUpdate {
  readonly historyFolder: string;
  readonly suppressionRules: readonly SuppressionRuleResult[];
}

/** Motivos por los que el motor no mueve el historial (HistoryFolderProblem en el motor). */
export type HistoryFolderProblem =
  "same_folder" | "folder_not_writable" | "folder_has_history" | "copy_mismatch";

export interface HistoryFolderResult {
  readonly historyFolder: string;
  readonly restartRequired: boolean;
}

export interface PreferencesStore {
  preferences(): Promise<PreferencesResult>;
  savePreferences(update: PreferencesUpdate): Promise<PreferencesResult>;
  suppressSimilar(sessionId: string, alertNumber: number): Promise<SuppressionRuleResult>;
  removeSuppressionRule(ruleId: number): Promise<void>;
  moveHistoryFolder(path: string): Promise<HistoryFolderResult>;
}
