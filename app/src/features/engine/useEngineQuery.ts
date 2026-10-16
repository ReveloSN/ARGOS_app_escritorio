import { useEffect, useRef, useState } from "react";

export type QueryState<Data> =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly data: Data }
  | { readonly status: "failed" };

export interface EngineQuery<Data> {
  readonly state: QueryState<Data>;
  readonly reload: () => void;
  /** Reemplaza el dato con la respuesta de un cambio (p. ej. los ajustes recién guardados). */
  readonly replace: (data: Data) => void;
}

/**
 * Consulta al motor que se repite cuando cambia `key` o con «Reintentar». Una respuesta que
 * llega tarde, de una consulta anterior, se descarta.
 */
export function useEngineQuery<Data>(key: string, load: () => Promise<Data>): EngineQuery<Data> {
  const [state, setState] = useState<QueryState<Data>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  // `load` cambia en cada render; se usa la última sin que su identidad dispare la consulta.
  const latestLoad = useRef(load);
  useEffect(() => {
    latestLoad.current = load;
  });
  useEffect(() => runQuery(latestLoad.current, setState), [key, attempt]);
  return {
    state,
    reload: () => {
      setAttempt((current) => current + 1);
    },
    replace: (data) => {
      setState({ status: "ready", data });
    },
  };
}

function runQuery<Data>(
  load: () => Promise<Data>,
  setState: (state: QueryState<Data>) => void,
): () => void {
  let isCurrent = true;
  setState({ status: "loading" });
  load().then(
    (data) => {
      if (isCurrent) setState({ status: "ready", data });
    },
    () => {
      if (isCurrent) setState({ status: "failed" });
    },
  );
  return () => {
    isCurrent = false;
  };
}
