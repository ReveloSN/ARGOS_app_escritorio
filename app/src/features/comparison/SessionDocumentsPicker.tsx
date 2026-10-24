import { useState } from "react";

import { Button } from "../../components/atoms/Button";
import { Checkbox } from "../../components/atoms/Checkbox";
import { useI18n } from "../../i18n/i18nContext";
import styles from "./Compare.module.css";

const MIN_DOCUMENTS = 2;

interface SessionDocumentsPickerProps {
  /** Los archivos leídos del expediente activo. */
  readonly documents: readonly string[];
  readonly onCompare: (documents: readonly string[]) => void;
}

function toggled(chosen: readonly string[], name: string, all: readonly string[]): string[] {
  const next = chosen.includes(name) ? chosen.filter((item) => item !== name) : [...chosen, name];
  // Se conserva el orden de carga: es el orden en que se comparan las versiones.
  return all.filter((item) => next.includes(item));
}

/** Los archivos que ya están en el expediente: se eligen y se comparan sin volver a subirlos. */
export function SessionDocumentsPicker({ documents, onCompare }: SessionDocumentsPickerProps) {
  const { t, tPlural } = useI18n();
  const [chosen, setChosen] = useState<readonly string[]>(documents);
  return (
    <section className={styles.fromSession}>
      <div role="group" aria-label={t("comparison.fromSession.title")}>
        <h2 className={styles.fromSessionTitle}>{t("comparison.fromSession.title")}</h2>
        <p className={styles.fromSessionHint}>{t("comparison.fromSession.description")}</p>
        {documents.map((name) => (
          <Checkbox
            key={name}
            label={name}
            checked={chosen.includes(name)}
            onChange={() => {
              setChosen(toggled(chosen, name, documents));
            }}
          />
        ))}
      </div>
      <Button
        variant="primary"
        disabled={chosen.length < MIN_DOCUMENTS}
        onClick={() => {
          onCompare(chosen);
        }}
      >
        {tPlural({ key: "comparison.fromSession.compare", count: chosen.length })}
      </Button>
    </section>
  );
}
