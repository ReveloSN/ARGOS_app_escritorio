import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { CLOSED_REVIEW, REVIEW } from "../../test/reviewFixtures";

async function openCurrentReview() {
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: /Revisión actual/ }));
}

describe("Resultados: filtros, búsqueda y acciones por fila", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("agrupa por riesgo y combina filtros y búsqueda", async () => {
    renderApp(fakeEngineServices(), REVIEW);
    await openCurrentReview();
    const user = userEvent.setup();

    const table = screen.getByRole("table", { name: "Lista de alertas" });
    expect(within(table).getByRole("rowheader", { name: /Riesgo alto/ })).toBeInTheDocument();
    expect(within(table).getByRole("rowheader", { name: /Riesgo medio/ })).toBeInTheDocument();
    expect(screen.getByText("Mostrando 2 de 2 alertas")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Riesgo: Todos" }));
    await user.click(
      within(screen.getByRole("group", { name: "Riesgo" })).getByRole("checkbox", { name: "Alto" }),
    );
    expect(screen.getByText("Mostrando 1 de 2 alertas")).toBeInTheDocument();
    expect(screen.getByText("1 alertas ocultas por los filtros.")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Buscar en alertas" }), "4875");
    expect(
      screen.getByRole("heading", { name: "Ninguna alerta coincide con «4875»" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Hay 1 filtros activos/)).toBeInTheDocument();
    // El enlace de la barra de filtros y el botón del estado vacío hacen lo mismo.
    const [, emptyStateButton] = screen.getAllByRole("button", { name: "Quitar filtros" });
    await user.click(emptyStateButton ?? document.body);
    expect(screen.getByText(/Busque el valor dentro de los documentos/)).toBeInTheDocument();
  });

  it("«Buscar en documentos» abre la búsqueda global con el texto escrito", async () => {
    const searchDocuments = vi.fn(() => Promise.resolve([]));
    renderApp(fakeEngineServices({ documents: { searchDocuments } }), REVIEW);
    await openCurrentReview();

    await userEvent.type(
      screen.getByRole("textbox", { name: "Buscar en alertas" }),
      "arrendamiento",
    );
    await userEvent.click(screen.getByRole("button", { name: "Buscar en documentos" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("arrendamiento");
  });

  it("el menú de la fila crea «No alertar casos similares»", async () => {
    const suppressSimilar = vi.fn(() =>
      Promise.resolve({
        id: 1,
        entityType: "contract_id" as const,
        firstLabel: "1234",
        secondLabel: "1324",
        createdAt: "",
      }),
    );
    renderApp(fakeEngineServices({ preferences: { suppressSimilar } }), REVIEW);
    await openCurrentReview();

    await userEvent.click(screen.getAllByRole("button", { name: "Acciones" })[0] ?? document.body);
    await userEvent.click(screen.getByRole("menuitem", { name: /No alertar casos similares/ }));

    expect(suppressSimilar).toHaveBeenCalledWith("s-1", 1);
    expect(await screen.findByText(/No se alertarán casos similares/)).toBeInTheDocument();
  });

  it("al cerrar la revisión queda en el historial", async () => {
    const closeReview = vi.fn(() => Promise.resolve(CLOSED_REVIEW.session));
    const history = vi.fn(() =>
      Promise.resolve({
        metrics: {
          sessionCount: 1,
          resolvedAlerts: 1,
          realErrorCount: 1,
          realErrorRate: 1,
          meanReviewSeconds: 1200,
        },
        sessions: [
          {
            id: "s-1",
            name: "Revisión de prueba",
            createdAt: REVIEW.session.createdAt,
            closedAt: CLOSED_REVIEW.session.closedAt,
            status: "closed" as const,
            documentCount: 3,
            alertCount: 2,
            decidedCount: 1,
          },
        ],
      }),
    );
    const openReview = vi.fn(() => Promise.resolve(CLOSED_REVIEW));
    renderApp(
      fakeEngineServices({ reviews: { closeReview, openReview }, history: { history } }),
      REVIEW,
    );
    await openCurrentReview();

    await userEvent.click(screen.getByRole("button", { name: "Cerrar revisión" }));

    expect(closeReview).toHaveBeenCalledWith("s-1");
    expect(await screen.findByRole("heading", { name: "Historial" })).toBeInTheDocument();
    expect(await screen.findByText(/^Cerrada el /)).toBeInTheDocument();
  });
});
