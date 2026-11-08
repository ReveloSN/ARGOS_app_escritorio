import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AiSettingsResult } from "../../services/engine/aiTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

const PROVIDERS = [
  { id: "anthropic" as const, model: "claude-sonnet-5-5" },
  { id: "deepseek" as const, model: "deepseek-flash" },
];
const ANTHROPIC: AiSettingsResult = {
  explainsChanges: false,
  provider: "anthropic",
  model: "claude-sonnet-5-5",
  hasKey: false,
  isKeychainAvailable: true,
  providers: PROVIDERS,
};
const DEEPSEEK: AiSettingsResult = { ...ANTHROPIC, provider: "deepseek", model: "deepseek-flash" };

// CLAUDE.md §8: una clave es de un proveedor; cambiar de proveedor no la lleva al otro.
describe("clave de IA al cambiar de proveedor", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) la clave escrita para Anthropic no se guarda como clave de DeepSeek", async () => {
    const storeKey = vi.fn(() => Promise.resolve({ ...DEEPSEEK, hasKey: true }));
    const setProvider = vi.fn(() => Promise.resolve(DEEPSEEK));
    renderApp(
      fakeEngineServices({
        ai: { aiSettings: () => Promise.resolve(ANTHROPIC), setProvider, storeKey },
      }),
    );
    await act(() => Promise.resolve());
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Ajustes/ }));
    await user.type(await screen.findByLabelText("Clave de la API de Anthropic"), "sk-ant-secreta");

    await user.selectOptions(screen.getByLabelText("Proveedor de IA"), "deepseek");
    const deepseekKey = await screen.findByLabelText("Clave de la API de DeepSeek");

    expect(deepseekKey).toHaveValue("");
    expect(screen.getByRole("button", { name: "Guardar clave" })).toBeDisabled();
    expect(storeKey).not.toHaveBeenCalled();
  });
});
