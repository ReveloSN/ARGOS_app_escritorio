import { useCallback, useRef, useState, type RefObject } from "react";

import { Checkbox } from "../atoms/Checkbox";
import { useDismiss } from "../useDismiss";
import styles from "./FilterControl.module.css";
import { FilterChip } from "./FilterChip";

export interface FilterOption {
  readonly value: string;
  readonly label: string;
}

interface FilterControlProps {
  /** Nombre de la faceta («Riesgo»). */
  readonly name: string;
  /** Texto del chip: «Riesgo: Alto, Medio» o «Tipo: Todos». */
  readonly summary: string;
  readonly options: readonly FilterOption[];
  readonly selected: readonly string[];
  readonly onToggle: (value: string) => void;
  readonly onClear: () => void;
}

/** Una faceta de la búsqueda: el chip y, al abrirlo, sus opciones combinables. */
export function FilterControl(props: FilterControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);
  return (
    <div ref={container} className={styles.control}>
      <FilterChip
        label={props.summary}
        active={props.selected.length > 0}
        onOpen={() => {
          setIsOpen((current) => !current);
        }}
        onRemove={props.onClear}
      />
      {isOpen && <FilterOptions {...props} container={container} onClose={close} />}
    </div>
  );
}

interface FilterOptionsProps extends FilterControlProps {
  readonly container: RefObject<HTMLDivElement | null>;
  readonly onClose: () => void;
}

function FilterOptions({
  name,
  options,
  selected,
  onToggle,
  container,
  onClose,
}: FilterOptionsProps) {
  useDismiss(container, onClose);
  return (
    <div role="group" aria-label={name} className={styles.options}>
      {options.map((option) => (
        <Checkbox
          key={option.value}
          label={option.label}
          checked={selected.includes(option.value)}
          onChange={() => {
            onToggle(option.value);
          }}
        />
      ))}
    </div>
  );
}
