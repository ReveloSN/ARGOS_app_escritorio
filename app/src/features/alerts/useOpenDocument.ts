import { useState } from "react";

import { useI18n } from "../../i18n/i18nContext";
import { EngineRejectedError } from "../../services/engine/engineHttp";
import { useEngineServices } from "../engine/EngineServicesContext";
import type { TimedNotice } from "./useTimedNotice";

// El motor responde así cuando la copia del archivo ya no está en la carpeta del historial.
const MISSING_COPY = "archived_file_missing";

export type OpenFailure = "missing" | "unavailable";

export interface DocumentOpener {
  readonly open: (document: string, location: string) => void;
  readonly failure: { readonly document: string; readonly kind: OpenFailure } | null;
  readonly dismiss: () => void;
}

function failureKind(error: unknown): OpenFailure {
  return error instanceof EngineRejectedError && error.detail === MISSING_COPY
    ? "missing"
    : "unavailable";
}

/** «Abrir en página N»: abre la copia del archivo con la aplicación del sistema. */
export function useOpenDocument(sessionId: string, notice: TimedNotice): DocumentOpener {
  const { t } = useI18n();
  const { documents } = useEngineServices();
  const [failure, setFailure] = useState<DocumentOpener["failure"]>(null);
  const open = (document: string, location: string) => {
    setFailure(null);
    const opened = () => {
      notice.show(t("openDocument.opened", { name: document, location }));
    };
    documents.openDocument(sessionId, document).then(opened, (error: unknown) => {
      setFailure({ document, kind: failureKind(error) });
    });
  };
  const dismiss = () => {
    setFailure(null);
  };
  return { open, failure, dismiss };
}
