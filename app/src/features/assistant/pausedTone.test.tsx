import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EngineUnavailableError } from "../../services/engine/engineHttp";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

const RISK_ICON = "report";

// El rojo y el icono de riesgo quedan para las alertas ALTAS (4857 frente a 4587). Un motor
// en pausa se dice con texto y «Reintentar», en el mismo tono neutro que el aviso del motor.
describe("asistente en pausa", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("la barra superior lo dice sin el icono de riesgo alto", async () => {
    const checkHealth = vi.fn(() => Promise.reject(new EngineUnavailableError("/health")));
    renderApp(fakeEngineServices({ checkHealth }));
    await act(() => Promise.resolve());

    const status = within(screen.getByRole("banner")).getByRole("status");

    expect(status).toHaveTextContent("Asistente de IA: en pausa");
    expect(status).not.toHaveTextContent(RISK_ICON);
    expect(within(status).getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
