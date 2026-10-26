import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionComparisonRequest } from "../../services/engine/comparisonTypes";
import { comparison } from "../../test/comparisonFakes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";

function engine() {
  const startSessionComparison = vi.fn((request: SessionComparisonRequest) => {
    request.onProgress?.({ kind: "pair_compared", position: 0, total: 1 });
    return Promise.resolve(comparison());
  });
  const startComparison = vi.fn(() => Promise.resolve(comparison()));
  return {
    startSessionComparison,
    startComparison,
    services: fakeEngineServices({ comparisons: { startSessionComparison, startComparison } }),
  };
}

async function openCompare() {
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: "Comparar" }));
}

describe("Comparar los archivos del expediente sin cargarlos otra vez", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ofrece los archivos leídos de la sesión activa y no los que no se pudieron leer", async () => {
    renderApp(engine().services, REVIEW);
    await openCompare();

    const group = screen.getByRole("group", { name: "Documentos del expediente" });

    expect(within(group).getByRole("checkbox", { name: "contrato.txt" })).toBeChecked();
    expect(within(group).getByRole("checkbox", { name: "anexo.pdf" })).toBeChecked();
    expect(
      within(group).queryByRole("checkbox", { name: "escaneado.pdf" }),
    ).not.toBeInTheDocument();
  });

  it("lista cada archivo en su propio renglón para que ninguno se pegue al otro", async () => {
    renderApp(engine().services, REVIEW);
    await openCompare();

    const group = screen.getByRole("group", { name: "Documentos del expediente" });

    expect(within(group).getAllByRole("listitem")).toHaveLength(2);
  });

  it("compara los elegidos con el motor, sin subir ningún archivo", async () => {
    const { services, startSessionComparison, startComparison } = engine();
    renderApp(services, REVIEW);
    await openCompare();

    await userEvent.click(screen.getByRole("button", { name: "Comparar los 2 elegidos" }));

    expect(await screen.findByRole("heading", { name: "Comparar documentos" })).toBeInTheDocument();
    expect(startSessionComparison).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "s-1",
        mode: "versions",
        documents: ["contrato.txt", "anexo.pdf"],
      }),
    );
    expect(startComparison).not.toHaveBeenCalled();
  });

  it("hacen falta al menos dos documentos", async () => {
    renderApp(engine().services, REVIEW);
    await openCompare();

    await userEvent.click(screen.getByRole("checkbox", { name: "anexo.pdf" }));

    expect(screen.getByRole("button", { name: "Comparar 1 elegido" })).toBeDisabled();
  });

  it("sin una sesión activa no se ofrece nada del expediente", async () => {
    renderApp(engine().services);
    await openCompare();

    expect(
      screen.queryByRole("group", { name: "Documentos del expediente" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elegir documentos" })).toBeInTheDocument();
  });
});
