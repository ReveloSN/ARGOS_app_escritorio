import { useState } from "react";

import { EngineRejectedError } from "../../services/engine/engineHttp";
import type {
  OcrGateway,
  OcrProcessorInput,
  OcrSettingsResult,
} from "../../services/engine/ocrTypes";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useEngineQuery } from "../engine/useEngineQuery";
import { useLatestChange } from "./useLatestChange";

const INVALID_CREDENTIALS = "invalid_credentials";

/** Qué salió mal al guardar: la clave no es de una cuenta de servicio o el motor no respondió. */
export type OcrChangeProblem = "invalid_credentials" | "failed" | null;

function problemOf(error: unknown): OcrChangeProblem {
  const isInvalid = error instanceof EngineRejectedError && error.detail === INVALID_CREDENTIALS;
  return isInvalid ? INVALID_CREDENTIALS : "failed";
}

type OcrRun = (kind: string, change: () => Promise<OcrSettingsResult>) => void;

function useOcrChange(onDone: (result: OcrSettingsResult) => void) {
  const [problem, setProblem] = useState<OcrChangeProblem>(null);
  const begin = useLatestChange();
  const run: OcrRun = (kind, change) => {
    setProblem(null);
    const turn = begin(kind);
    change().then(
      (result) => {
        if (turn.claim()) onDone(result);
      },
      // Se dice, salvo que un cambio más nuevo del mismo ajuste ya se haya guardado.
      (error: unknown) => {
        if (!turn.isFailureStale()) setProblem(problemOf(error));
      },
    );
  };
  return { run, problem };
}

function ocrActions(ocr: OcrGateway, run: OcrRun) {
  return {
    setUsesCloud: (enabled: boolean) => {
      run("usesCloud", () => ocr.setUsesCloud(enabled));
    },
    setProcessor: (processor: OcrProcessorInput) => {
      run("processor", () => ocr.setProcessor(processor));
    },
    storeCredentials: (credentials: string) => {
      run("credentials", () => ocr.storeCredentials(credentials));
    },
    removeCredentials: () => {
      run("credentials", () => ocr.removeCredentials());
    },
  };
}

/** Ajustes › OCR: Tesseract local y Document AI con su procesador y su clave en el llavero. */
export function useOcrSettings(onSaved: () => void) {
  const { ocr } = useEngineServices();
  const query = useEngineQuery("ocr-settings", () => ocr.ocrSettings());
  const { run, problem } = useOcrChange((result) => {
    query.replace(result);
    onSaved();
  });
  return { ...query, problem, ...ocrActions(ocr, run) };
}

export type OcrSettingsControl = ReturnType<typeof useOcrSettings>;
