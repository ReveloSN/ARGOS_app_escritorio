import { useState } from "react";

import { filterRows, type FactFilter, type FactRow } from "./factRows";

/** La fila que se está editando y el texto escrito hasta ahora. */
export interface FactEditing {
  readonly key: string;
  readonly draft: string;
}

interface FactEditingState {
  readonly editing: FactEditing | null;
  readonly startEditing: (key: string, draft: string) => void;
  readonly setDraft: (draft: string) => void;
  readonly stopEditing: () => void;
}

export interface FactsView extends FactEditingState {
  readonly filter: FactFilter;
  readonly setFilter: (filter: FactFilter) => void;
  readonly visible: readonly FactRow[];
  readonly selected: FactRow | undefined;
  readonly select: (key: string) => void;
}

function useFactEditing(select: (key: string) => void): FactEditingState {
  const [editing, setEditing] = useState<FactEditing | null>(null);
  return {
    editing,
    startEditing: (key, draft) => {
      select(key);
      setEditing({ key, draft });
    },
    setDraft: (draft) => {
      setEditing((current) => current && { ...current, draft });
    },
    stopEditing: () => {
      setEditing(null);
    },
  };
}

/** Filtro, fila elegida (su detalle va en el panel lateral) y edición en línea de un valor. */
export function useFactsView(rows: readonly FactRow[]): FactsView {
  const [filter, setFilter] = useState<FactFilter>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const visible = filterRows(rows, filter);
  const selected = visible.find((row) => row.key === selectedKey) ?? visible[0];
  const editing = useFactEditing(setSelectedKey);
  return { filter, setFilter, visible, selected, select: setSelectedKey, ...editing };
}
