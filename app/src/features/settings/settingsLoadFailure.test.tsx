import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AiSettingsResult } from "../../services/engine/aiTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

const OFF: AiSettingsResult = {
  explainsChanges: false,
  provider: "anthropic",
  model: "claude-sonnet-5-5",
  hasKey: false,
  isKeychainAvailable: true,
  providers: [{ id: "anthropic", model: "claude-sonnet-5-5" }],
};

describe("Ajustes cuando el motor no responde", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) lo explica en 3 partes y «Reintentar» vuelve a pedir los ajustes de IA", async () => {
    const aiSettings = vi
      .fn<() => Promise<AiSettingsResult>>()
      .mockRejectedValueOnce(new Error("sin respuesta"))
      .mockResolvedValue(OFF);
    renderApp(fakeEngineServices({ ai: { aiSettings } }));
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByRole("button", { name: /Ajustes/ }));

    expect(await screen.findByText("No pudimos cargar los ajustes de IA.")).toBeVisible();
    expect(screen.getAllByText(/todavía está arrancando o no está en marcha/)[0]).toBeVisible();
    const aiError = screen
      .getByText("No pudimos cargar los ajustes de IA.")
      .closest('[role="alert"]');
    await userEvent.click(
      within(aiError as HTMLElement).getByRole("button", { name: "Reintentar" }),
    );

    expect(await screen.findByRole("switch", { name: "Explicar cambios con IA" })).toBeVisible();
    expect(aiSettings).toHaveBeenCalledTimes(2);
  });
});
