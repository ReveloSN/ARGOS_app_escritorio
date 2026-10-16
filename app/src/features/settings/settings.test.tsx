import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PreferencesResult, PreferencesUpdate } from "../../services/engine/preferencesTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

const PREFERENCES: PreferencesResult = {
  sensitivity: "balanced",
  comparedCategories: ["amounts", "dates", "identifiers", "names", "periods"],
  hasRetentionLimit: true,
  historyFolder: "C:\\Usuarios\\equipo\\ARGUS",
  suppressionRules: [
    {
      id: 7,
      entityType: "organization_name",
      firstLabel: "Logística Andina S.A.S.",
      secondLabel: "LOGISTICA ANDINA SAS",
      createdAt: "2026-10-02T10:00:00+00:00",
    },
  ],
};

function saving() {
  return vi.fn((update: PreferencesUpdate) => Promise.resolve({ ...PREFERENCES, ...update }));
}

async function openSettings() {
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: /Ajustes/ }));
}

describe("Ajustes", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("guarda la sensibilidad al instante y lo confirma", async () => {
    const savePreferences = saving();
    renderApp(
      fakeEngineServices({
        preferences: { preferences: () => Promise.resolve(PREFERENCES), savePreferences },
      }),
    );
    await openSettings();

    await userEvent.click(await screen.findByRole("radio", { name: "Estricta" }));

    expect(savePreferences).toHaveBeenCalledWith({
      sensitivity: "strict",
      comparedCategories: PREFERENCES.comparedCategories,
      hasRetentionLimit: true,
    });
    expect(await screen.findByText(/Se guardaron los cambios/)).toBeInTheDocument();
    expect(screen.getByText(/Detecta también diferencias solo de formato/)).toBeInTheDocument();
  });

  it("no deja desmarcar el último tipo que se compara", async () => {
    const onlyAmounts = { ...PREFERENCES, comparedCategories: ["amounts" as const] };
    renderApp(
      fakeEngineServices({ preferences: { preferences: () => Promise.resolve(onlyAmounts) } }),
    );
    await openSettings();

    const types = await screen.findByRole("group", { name: "Tipos que se comparan" });
    expect(within(types).getByRole("checkbox", { name: "Montos" })).toBeDisabled();
    expect(within(types).getByRole("checkbox", { name: "Fechas" })).toBeEnabled();
  });

  it("quita un caso que no genera alerta", async () => {
    const removeSuppressionRule = vi.fn(() => Promise.resolve());
    const preferences = vi
      .fn()
      .mockResolvedValueOnce(PREFERENCES)
      .mockResolvedValueOnce({ ...PREFERENCES, suppressionRules: [] });
    renderApp(fakeEngineServices({ preferences: { preferences, removeSuppressionRule } }));
    await openSettings();

    await userEvent.click(await screen.findByRole("button", { name: /Quitar «Logística Andina/ }));

    expect(removeSuppressionRule).toHaveBeenCalledWith(7);
    expect(await screen.findByText(/Todavía no hay casos/)).toBeInTheDocument();
  });

  it("muestra la carpeta del historial y explica la retención elegida", async () => {
    const savePreferences = saving();
    renderApp(
      fakeEngineServices({
        preferences: { preferences: () => Promise.resolve(PREFERENCES), savePreferences },
      }),
    );
    await openSettings();

    expect(await screen.findByText("C:\\Usuarios\\equipo\\ARGUS")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch", { name: /90 días/ }));
    expect(savePreferences).toHaveBeenCalledWith(
      expect.objectContaining({ hasRetentionLimit: false }),
    );
    expect(
      await screen.findByText("El historial se conserva sin límite de tiempo."),
    ).toBeInTheDocument();
  });

  it("cambia el idioma y el formato regional aunque el motor no responda", async () => {
    renderApp(fakeEngineServices());
    await openSettings();

    expect(await screen.findAllByText("No pudimos cargar estos ajustes.")).toHaveLength(2);
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Formato regional" }),
      "en-US",
    );
    expect(screen.getByText(/USD/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Idioma" }), "en");
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });
});
