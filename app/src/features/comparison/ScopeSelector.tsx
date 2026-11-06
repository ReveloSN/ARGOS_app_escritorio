import { SelectField, type SelectOption } from "../../components/molecules/SelectField";
import { useI18n } from "../../i18n/i18nContext";
import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import {
  againstAll,
  againstDocument,
  comparedDocumentNames,
  otherDocuments,
  type CompareScope,
} from "./comparisonScope";
import styles from "./Compare.module.css";

const ALL_VALUE = "\u0000all";

interface ScopeSelectorProps {
  readonly comparison: ComparisonResult;
  readonly scope: CompareScope;
  readonly onScope: (scope: CompareScope) => void;
}

function asOptions(names: readonly string[]): SelectOption[] {
  return names.map((name) => ({ value: name, label: name }));
}

/** Elige el documento base y contra qué se compara: todos los demás o uno concreto. */
export function ScopeSelector({ comparison, scope, onScope }: ScopeSelectorProps) {
  const { t, tPlural } = useI18n();
  const others = otherDocuments(comparison, scope.base);
  const against: SelectOption[] = [
    {
      value: ALL_VALUE,
      label: tPlural({ key: "comparison.scope.allOthers", count: others.length }),
    },
    ...asOptions(others),
  ];
  return (
    <div role="group" aria-label={t("comparison.scope.label")} className={styles.scopeSelector}>
      <SelectField
        label={t("comparison.scope.base")}
        value={scope.base}
        options={asOptions(comparedDocumentNames(comparison))}
        onChange={(base) => {
          onScope(againstAll(base));
        }}
      />
      <SelectField
        label={t("comparison.scope.against")}
        value={scope.against.kind === "all" ? ALL_VALUE : scope.against.name}
        options={against}
        onChange={(value) => {
          onScope(
            value === ALL_VALUE ? againstAll(scope.base) : againstDocument(scope.base, value),
          );
        }}
      />
    </div>
  );
}
