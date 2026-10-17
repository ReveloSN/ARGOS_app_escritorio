import { useState } from "react";

import { useI18n } from "../../i18n/i18nContext";
import type { DesktopShell } from "../../services/desktop/desktopShell";
import { EngineRejectedError } from "../../services/engine/engineHttp";
import type { EngineStatusMonitor } from "../../services/engine/engineStatusMonitor";
import type {
  HistoryFolderProblem,
  PreferencesStore,
} from "../../services/engine/preferencesTypes";
import { useEngineServices } from "../engine/EngineServicesContext";

const KNOWN_PROBLEMS: readonly HistoryFolderProblem[] = [
  "same_folder",
  "folder_not_writable",
  "folder_has_history",
  "copy_mismatch",
];

/** Motivo del mensaje de error; «engine_unavailable» si el motor no llegó a responder. */
export type HistoryFolderFailure = HistoryFolderProblem | "engine_unavailable";

export type HistoryFolderChangeState =
  | { readonly status: "idle" }
  | { readonly status: "moving" }
  | { readonly status: "moved" }
  | { readonly status: "failed"; readonly failure: HistoryFolderFailure };

export interface HistoryFolderChange {
  readonly state: HistoryFolderChangeState;
  readonly change: () => void;
}

interface HistoryMove {
  readonly preferences: PreferencesStore;
  readonly desktop: DesktopShell;
  readonly statusMonitor: EngineStatusMonitor;
}

function failureOf(error: unknown): HistoryFolderFailure {
  if (!(error instanceof EngineRejectedError)) return "engine_unavailable";
  return KNOWN_PROBLEMS.find((problem) => problem === error.detail) ?? "engine_unavailable";
}

/**
 * Elige la carpeta; el motor copia ahí el historial y, al reiniciarse, empieza a usarla.
 * Devuelve `false` si el usuario cerró el selector sin elegir.
 */
async function pickAndMove(
  title: string,
  { preferences, desktop, statusMonitor }: HistoryMove,
  report: (state: HistoryFolderChangeState) => void,
): Promise<boolean> {
  const folder = await desktop.pickFolder(title);
  if (!folder) return false;
  report({ status: "moving" });
  await preferences.moveHistoryFolder(folder);
  await desktop.restartEngine();
  await statusMonitor.whenReady();
  report({ status: "moved" });
  return true;
}

/**
 * Ajustes > Privacidad: elegir otra carpeta, copiar ahí el historial y reiniciar el motor para
 * que la use. Solo existe en la app de escritorio; en el navegador devuelve `null`.
 */
export function useHistoryFolderChange(onMoved: () => void): HistoryFolderChange | null {
  const { t } = useI18n();
  const services = useEngineServices();
  const [state, setState] = useState<HistoryFolderChangeState>({ status: "idle" });
  const { desktop } = services;
  if (!desktop) return null;
  const change = () => {
    pickAndMove(t("settings.privacy.chooseFolder"), { ...services, desktop }, setState).then(
      (isMoved) => {
        if (isMoved) onMoved();
      },
      (error: unknown) => {
        setState({ status: "failed", failure: failureOf(error) });
      },
    );
  };
  return { state, change };
}
