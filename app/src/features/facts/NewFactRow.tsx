import { useState } from "react";

import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import type { FactInput } from "../../services/engine/factTypes";
import type { EntityTypeValue } from "../../services/engine/reviewTypes";
import { entityTypeLabel } from "../alerts/alertPresentation";
import styles from "./Facts.module.css";

const ENTITY_TYPES: readonly EntityTypeValue[] = [
  "contract_id",
  "tax_id",
  "money",
  "date",
  "period",
  "organization_name",
  "person_name",
];

interface NewFactRowProps {
  readonly onAdd: (input: FactInput) => void;
  readonly onDone: () => void;
}

/** «Agregar dato»: una fila nueva en la tabla con su nombre, su tipo y el valor confirmado. */
export function NewFactRow({ onAdd, onDone }: NewFactRowProps) {
  const { t } = useI18n();
  const [label, setLabel] = useState("");
  const [entityType, setEntityType] = useState<EntityTypeValue>("contract_id");
  const [value, setValue] = useState("");
  const canSave = Boolean(label.trim() && value.trim());
  const save = () => {
    onAdd({ label: label.trim(), entityType, value: value.trim() });
    onDone();
  };
  return (
    <div role="row" className={joinClassNames(styles.row, styles.bodyRow, styles.newRow)}>
      <span role="cell" className={styles.dataCell}>
        <input
          aria-label={t("facts.form.label")}
          placeholder={t("facts.form.labelPlaceholder")}
          className={styles.textInput}
          value={label}
          onChange={(event) => {
            setLabel(event.target.value);
          }}
        />
        <select
          aria-label={t("facts.form.type")}
          className={styles.typeSelect}
          value={entityType}
          onChange={(event) => {
            setEntityType(event.target.value as EntityTypeValue);
          }}
        >
          {ENTITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {entityTypeLabel(type, t)}
            </option>
          ))}
        </select>
      </span>
      <span role="cell" className={styles.cell}>
        <input
          aria-label={t("facts.form.value")}
          placeholder={t("facts.form.valuePlaceholder")}
          className={styles.valueInput}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && canSave) save();
            if (event.key === "Escape") onDone();
          }}
        />
      </span>
      <span role="cell" />
      <span role="cell" />
      <span role="cell" className={styles.actions}>
        <button type="button" className={styles.actionPrimary} disabled={!canSave} onClick={save}>
          {t("facts.actions.save")}
        </button>
        <button type="button" className={styles.action} onClick={onDone}>
          {t("facts.actions.cancel")}
        </button>
      </span>
    </div>
  );
}
