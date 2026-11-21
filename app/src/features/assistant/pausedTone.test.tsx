import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EngineUnavailableError } from "../../services/engine/engineHttp";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

const RISK_ICON = "report";

function stoppedEngine() {
  return vi.fn(() => Promise.reject(new EngineUnavailableError("/health")));
}

async function renderStopped(checkHealth = stoppedEngine()) {
  renderApp(fakeEngineServices({ checkHealth }));
  await act(() => Promise.resolve());
  return checkHealth;
}

// Un motor en pausa se dice una sola vez: un aviso con «Reintentar conexión» y el estado del
// asistente en la barra lateral. El rojo y el icono de riesgo quedan para las alertas ALTAS.
describe("asistente en pausa", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("muestra un único aviso de conexión, sin el icono de riesgo alto", async () => {
    await renderStopped();

    const notices = screen.getAllByRole("alert");
    expect(notices).toHaveLength(1);
    expect(notices[0]).toHaveTextContent("El motor de análisis no responde.");
    expect(notices[0]).not.toHaveTextContent(RISK_ICON);
    expect(screen.getAllByRole("button", { name: /Reintentar/ })).toHaveLength(1);
  });

  it("la barra superior no repite el estado; la barra lateral lo conserva", async () => {
    await renderStopped();

    expect(within(screen.getByRole("banner")).queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Asistente de IA: En pausa" })).toBeInTheDocument();
  });

  it("al cambiar a Comparar el aviso sigue siendo uno solo", async () => {
    await renderStopped();

    await userEvent.click(screen.getByRole("button", { name: "Comparar" }));

    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("si el reintento falla, dice a qué hora siguió sin responder", async () => {
    const checkHealth = await renderStopped();

    await userEvent.click(screen.getByRole("button", { name: "Reintentar conexión" }));

    expect(checkHealth.mock.calls.length).toBeGreaterThan(1);
    expect(await screen.findByText(/^Seguía sin responder a las /)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar conexión" })).toBeEnabled();
  });

  it("desaparece cuando el motor vuelve a responder", async () => {
    let isUp = false;
    const checkHealth = vi.fn(() =>
      isUp
        ? Promise.resolve({ status: "ok", version: "test" })
        : Promise.reject(new EngineUnavailableError("/health")),
    );
    await renderStopped(checkHealth);
    isUp = true;

    await userEvent.click(screen.getByRole("button", { name: "Reintentar conexión" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
