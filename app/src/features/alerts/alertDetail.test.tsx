import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EngineRejectedError } from "../../services/engine/engineHttp";
import type { DecisionsResult } from "../../services/engine/reviewTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { CLOSED_REVIEW, REVIEW } from "../../test/reviewFixtures";

const ERROR_ON_FIRST: DecisionsResult = {
  decisions: [
    { alertNumber: 1, kind: "error", correctSide: null, decidedAt: "2026-10-15T10:05:00+00:00" },
  ],
  canUndo: true,
};

async function openCurrentReview() {
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: /Revisión actual/ }));
}

async function openFirstAlert() {
  await openCurrentReview();
  const table = screen.getByRole("table", { name: "Lista de alertas" });
  await userEvent.click(within(table).getAllByRole("row")[2] ?? table);
}

describe("Detalle de alerta: decisiones, deshacer y origen", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("decide en el detalle, indica el valor correcto y deshace con la confirmación", async () => {
    const decide = vi.fn(() => Promise.resolve(ERROR_ON_FIRST));
    const undoDecision = vi.fn(() => Promise.resolve({ decisions: [], canUndo: false }));
    renderApp(fakeEngineServices({ reviews: { decide, undoDecision } }), REVIEW);
    await openFirstAlert();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Es un error/ }));
    expect(decide).toHaveBeenCalledWith("s-1", { alertNumber: 1, kind: "error" });
    expect(await screen.findByText("Alerta 1 marcada como «Es un error».")).toBeInTheDocument();
    expect(screen.getByText("Diferencia: posiciones 2 y 3 intercambiadas")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /1234 Valor A/ }));
    expect(decide).toHaveBeenLastCalledWith("s-1", {
      alertNumber: 1,
      kind: "error",
      correctSide: "first",
    });

    await user.click(screen.getByRole("button", { name: /Deshacer/ }));
    expect(undoDecision).toHaveBeenCalledWith("s-1");
    expect(await screen.findByText("Se deshizo la decisión.")).toBeInTheDocument();
  });

  it("decide con las teclas C, E e I y se mueve con J y K", async () => {
    const decide = vi.fn(() => Promise.resolve(ERROR_ON_FIRST));
    renderApp(fakeEngineServices({ reviews: { decide } }), REVIEW);
    await openFirstAlert();

    await userEvent.keyboard("c");
    expect(decide).toHaveBeenCalledWith("s-1", { alertNumber: 1, kind: "correct" });
    await userEvent.keyboard("j");
    expect(
      screen.getByRole("heading", { name: "El nombre de una persona es distinto" }),
    ).toBeInTheDocument();
    await userEvent.keyboard("k");
    expect(screen.getByText("Alerta 1 de 2")).toBeInTheDocument();
  });

  it("si una decisión no se guarda, lo dice y permite reintentar", async () => {
    const decide = vi
      .fn()
      .mockRejectedValueOnce(new Error("motor detenido"))
      .mockResolvedValueOnce(ERROR_ON_FIRST);
    renderApp(fakeEngineServices({ reviews: { decide } }), REVIEW);
    await openFirstAlert();

    await userEvent.click(screen.getByRole("button", { name: /Es un error/ }));
    const message = await screen.findByText("No se guardó la decisión sobre la Alerta 1.");
    expect(message).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(decide).toHaveBeenCalledTimes(2);
  });

  it("una revisión cerrada se muestra como solo lectura", async () => {
    renderApp(fakeEngineServices(), CLOSED_REVIEW);
    await openCurrentReview();

    expect(screen.queryByRole("button", { name: "Cerrar revisión" })).not.toBeInTheDocument();
    expect(screen.getByText("Cerrada · solo lectura")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Lista de alertas" });
    await userEvent.click(within(table).getAllByRole("row")[2] ?? table);
    expect(
      screen.queryByRole("region", { name: "¿Cómo quiere continuar?" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Revisión cerrada el/)).toBeInTheDocument();
  });

  it("abre el archivo original y explica si su copia ya no está", async () => {
    const openDocument = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new EngineRejectedError("/open", "archived_file_missing"));
    renderApp(fakeEngineServices({ documents: { openDocument } }), REVIEW);
    await openFirstAlert();

    await userEvent.click(screen.getByRole("button", { name: /Abrir en página 3/ }));
    expect(openDocument).toHaveBeenCalledWith("s-1", "anexo.pdf");
    expect(await screen.findByText(/Se abrió «anexo.pdf»/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Abrir en página 3/ }));
    expect(await screen.findByText("No pudimos abrir «anexo.pdf».")).toBeInTheDocument();
    expect(
      screen.getByText(/se movió o se eliminó de la carpeta del historial/),
    ).toBeInTheDocument();
  });

  it("muestra todas las apariciones de un valor con su origen", async () => {
    renderApp(fakeEngineServices(), REVIEW);
    await openFirstAlert();

    await userEvent.click(screen.getByRole("button", { name: "Ver las 2 apariciones" }));

    const list = screen.getByRole("list", { name: "Todas las apariciones" });
    expect(list).toHaveTextContent("acta.txt");
    expect(list).toHaveTextContent("Línea 4");
  });
});
