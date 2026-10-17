import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DesktopShell } from "../../services/desktop/desktopShell";
import { EngineRejectedError } from "../../services/engine/engineHttp";
import type { PreferencesResult } from "../../services/engine/preferencesTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

const CURRENT = "C:\\Usuarios\\equipo\\ARGUS";
const CHOSEN = "D:\\Respaldo\\ARGUS";

const PREFERENCES: PreferencesResult = {
  sensitivity: "balanced",
  comparedCategories: ["amounts", "dates", "identifiers", "names", "periods"],
  hasRetentionLimit: true,
  historyFolder: CURRENT,
  suppressionRules: [],
};

function desktopChoosing(...folders: (string | null)[]) {
  const pickFolder = vi.fn<DesktopShell["pickFolder"]>();
  folders.forEach((folder) => pickFolder.mockResolvedValueOnce(folder));
  const restartEngine = vi.fn(() => Promise.resolve());
  const desktop: DesktopShell = { pickFolder, restartEngine };
  return { desktop, pickFolder, restartEngine };
}

async function openPrivacy() {
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: /Ajustes/ }));
  return screen.findByRole("button", { name: "Cambiar carpeta" });
}

describe("Carpeta del historial", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("en el navegador solo se muestra la carpeta, sin cambiarla", async () => {
    renderApp(
      fakeEngineServices({ preferences: { preferences: () => Promise.resolve(PREFERENCES) } }),
    );
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByRole("button", { name: /Ajustes/ }));

    expect(await screen.findByText(CURRENT)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cambiar carpeta" })).not.toBeInTheDocument();
  });

  it("mueve el historial, reinicia el motor y muestra la nueva carpeta", async () => {
    const { desktop, restartEngine } = desktopChoosing(CHOSEN);
    const moveHistoryFolder = vi.fn(() =>
      Promise.resolve({ historyFolder: CHOSEN, restartRequired: true }),
    );
    const preferences = vi
      .fn()
      .mockResolvedValueOnce(PREFERENCES)
      .mockResolvedValueOnce({ ...PREFERENCES, historyFolder: CHOSEN });
    renderApp(fakeEngineServices({ desktop, preferences: { preferences, moveHistoryFolder } }));

    await userEvent.click(await openPrivacy());

    expect(await screen.findByText(/El historial ya está en la nueva carpeta/)).toBeInTheDocument();
    expect(moveHistoryFolder).toHaveBeenCalledWith(CHOSEN);
    expect(restartEngine).toHaveBeenCalledOnce();
    expect(screen.getByText(CHOSEN)).toBeInTheDocument();
  });

  it("no hace nada si se cierra el selector sin elegir", async () => {
    const moveHistoryFolder = vi.fn();
    renderApp(
      fakeEngineServices({
        desktop: desktopChoosing(null).desktop,
        preferences: { preferences: () => Promise.resolve(PREFERENCES), moveHistoryFolder },
      }),
    );

    await userEvent.click(await openPrivacy());

    expect(moveHistoryFolder).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("explica por qué no movió el historial y deja elegir otra carpeta", async () => {
    const { desktop, pickFolder, restartEngine } = desktopChoosing(CHOSEN, null);
    const rejected = new EngineRejectedError("/preferences/history-folder", "folder_has_history");
    renderApp(
      fakeEngineServices({
        desktop,
        preferences: {
          preferences: () => Promise.resolve(PREFERENCES),
          moveHistoryFolder: () => Promise.reject(rejected),
        },
      }),
    );

    await userEvent.click(await openPrivacy());

    expect(await screen.findByText("No movimos el historial.")).toBeInTheDocument();
    expect(screen.getByText(/ya tiene un historial de ARGUS/)).toBeInTheDocument();
    expect(restartEngine).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Elegir otra carpeta" }));
    expect(pickFolder).toHaveBeenCalledTimes(2);
  });
});
