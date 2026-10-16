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

export interface PreferencesStore {
  preferences(): Promise<PreferencesResult>;
  savePreferences(update: PreferencesUpdate): Promise<PreferencesResult>;
  suppressSimilar(sessionId: string, alertNumber: number): Promise<SuppressionRuleResult>;
  removeSuppressionRule(ruleId: number): Promise<void>;
}
