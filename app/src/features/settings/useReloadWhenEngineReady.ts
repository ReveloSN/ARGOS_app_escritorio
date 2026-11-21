import { useEffect, useRef } from "react";

import { useEngineStatus } from "../engine/useEngineStatus";

/**
 * Llama a `reload` una sola vez cada vez que el motor pasa a responder (al terminar de arrancar o
 * al volver de una pausa). No reintenta en bucle: si la carga vuelve a fallar con el motor listo,
 * el error se queda y lo atiende «Reintentar».
 */
export function useReloadWhenEngineReady(reload: () => void): void {
  const status = useEngineStatus();
  const previous = useRef(status);
  const latestReload = useRef(reload);
  useEffect(() => {
    latestReload.current = reload;
  });
  useEffect(() => {
    const wasReady = previous.current === "ready";
    previous.current = status;
    if (status === "ready" && !wasReady) latestReload.current();
  }, [status]);
}
