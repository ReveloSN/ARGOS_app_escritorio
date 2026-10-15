import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { EngineServicesContext } from "./features/engine/EngineServicesContext";
import { ThemeProvider } from "./features/settings/theme/ThemeProvider";
import { I18nProvider } from "./i18n/I18nProvider";
import { EngineStatusMonitor } from "./services/engine/engineStatusMonitor";

function renderApp(monitor: EngineStatusMonitor) {
  return render(
    <I18nProvider>
      <ThemeProvider>
        <EngineServicesContext.Provider value={{ statusMonitor: monitor }}>
          <App />
        </EngineServicesContext.Provider>
      </ThemeProvider>
    </I18nProvider>,
  );
}

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("muestra la navegación global y la barra superior", () => {
    renderApp(new EngineStatusMonitor({ checkHealth: () => new Promise(vi.fn()) }));

    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("muestra en la barra superior que el motor está listo cuando responde", async () => {
    renderApp(
      new EngineStatusMonitor({
        checkHealth: () => Promise.resolve({ status: "ok", version: "1" }),
      }),
    );
    await act(() => Promise.resolve());

    expect(screen.getByRole("banner")).toHaveTextContent("Motor de análisis: listo");
  });
});
