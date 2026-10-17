import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { describe, expect, it, vi } from "vitest";

import { TauriDesktopShell } from "./tauriDesktopShell";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));

describe("TauriDesktopShell", () => {
  it("pide una sola carpeta al selector del sistema", async () => {
    vi.mocked(open).mockResolvedValueOnce("D:\\Respaldo");

    const folder = await new TauriDesktopShell().pickFolder("Elegir carpeta");

    expect(folder).toBe("D:\\Respaldo");
    expect(open).toHaveBeenCalledWith({
      directory: true,
      multiple: false,
      title: "Elegir carpeta",
    });
  });

  it("reinicia el motor con el comando de Tauri", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(undefined);

    await new TauriDesktopShell().restartEngine();

    expect(invoke).toHaveBeenCalledWith("restart_engine");
  });
});
