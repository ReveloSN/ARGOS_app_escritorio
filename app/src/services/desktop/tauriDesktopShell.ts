import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

import type { DesktopShell } from "./desktopShell";

// Comando definido en src-tauri/src/engine_supervisor.rs.
const RESTART_ENGINE_COMMAND = "restart_engine";

export class TauriDesktopShell implements DesktopShell {
  pickFolder(title: string): Promise<string | null> {
    return open({ directory: true, multiple: false, title });
  }

  restartEngine(): Promise<void> {
    return invoke(RESTART_ENGINE_COMMAND);
  }
}
