import { useState } from "react";

import type { OcrGateway, OcrProviderValue } from "../../services/engine/ocrTypes";
import type { DocumentReadResult } from "../../services/engine/reviewTypes";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useReview } from "./reviewContext";
import type { ReviewStartOptions } from "./useStartReview";

export interface ActivateOcr {
  readonly activate: (document: DocumentReadResult) => void;
  /** El archivo que espera el consentimiento para ir a Document AI; null si no hay ninguno. */
  readonly awaitingConsent: DocumentReadResult | null;
  readonly readWith: (provider: OcrProviderValue) => void;
  readonly cancel: () => void;
}

type ReadFile = (document: DocumentReadResult, provider: OcrProviderValue) => void;

interface ConsentRoutes {
  readonly ask: (document: DocumentReadResult) => void;
  readonly readLocal: (document: DocumentReadResult) => void;
}

/** Sin respuesta sobre Document AI, nada sale del equipo: se lee en local. */
function routeByCloudReadiness(
  ocr: OcrGateway,
  document: DocumentReadResult,
  routes: ConsentRoutes,
): void {
  ocr.ocrSettings().then(
    (settings) => {
      if (settings.isCloudReady) routes.ask(document);
      else routes.readLocal(document);
    },
    () => {
      routes.readLocal(document);
    },
  );
}

/** Relee la revisión con OCR para ese archivo, reemplazando la lectura aún sin revisar. */
function useRereadFile(reread: (options: ReviewStartOptions) => void): ReadFile {
  const replaces = useReview().review?.session.id;
  return (document, provider) => {
    const ocr = { fileNames: [document.name], provider };
    reread({ ocr, ...(replaces && { replaces }) });
  };
}

/**
 * «Activar OCR»: con Document AI listo se pide consentimiento (cuántas páginas saldrán del
 * equipo); si no, se relee con OCR local.
 */
export function useActivateOcr(reread: (options: ReviewStartOptions) => void): ActivateOcr {
  const { ocr } = useEngineServices();
  const [awaitingConsent, setAwaitingConsent] = useState<DocumentReadResult | null>(null);
  const readFile = useRereadFile(reread);
  const cancel = () => {
    setAwaitingConsent(null);
  };
  const readLocal = (document: DocumentReadResult) => {
    readFile(document, "local");
  };
  const readWith = (provider: OcrProviderValue) => {
    cancel();
    if (awaitingConsent) readFile(awaitingConsent, provider);
  };
  const activate = (document: DocumentReadResult) => {
    routeByCloudReadiness(ocr, document, { ask: setAwaitingConsent, readLocal });
  };
  return { activate, awaitingConsent, readWith, cancel };
}
