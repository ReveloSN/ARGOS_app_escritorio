import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { EngineServicesContext } from "./features/engine/EngineServicesContext";
import { EngineStatusMonitor } from "./services/engine/engineStatusMonitor";

function renderWithMonitor(monitor: EngineStatusMonitor) {
  return render(
    <EngineServicesContext.Provider value={{ statusMonitor: monitor }}>
      <App />
    </EngineServicesContext.Provider>,
  );
}

describe("App", () => {
  it("muestra el nombre de la aplicación tomado de i18n", () => {
    const monitor = new EngineStatusMonitor({ checkHealth: () => new Promise(vi.fn()) });

    renderWithMonitor(monitor);

    expect(screen.getByRole("heading", { level: 1, name: "ARGUS" })).toBeInTheDocument();
  });

  it("muestra que el motor está listo cuando responde", async () => {
    const monitor = new EngineStatusMonitor({
      checkHealth: () => Promise.resolve({ status: "ok", version: "1" }),
    });

    renderWithMonitor(monitor);
    await act(() => Promise.resolve());

    expect(screen.getByRole("status")).toHaveTextContent("Motor de análisis: listo");
  });
});
