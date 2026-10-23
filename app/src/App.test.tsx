import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EngineUnavailableError } from "./services/engine/engineHttp";
import type { ReviewRequest, ReviewResult } from "./services/engine/reviewTypes";
import { fakeEngineServices } from "./test/engineFakes";
import { renderApp, stubBrowser } from "./test/renderApp";
import { REVIEW } from "./test/reviewFixtures";

describe("App", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(a) al iniciar sin revisión muestra Inicio vacío, sin alertas ni contadores", async () => {
    renderApp(fakeEngineServices());
    await act(() => Promise.resolve());

    expect(screen.getByRole("heading", { name: "Todavía no hay revisiones" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /Comparar/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Sesión activa")).not.toBeInTheDocument();
    expect(screen.queryByText(/pendiente/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Expediente/ })).not.toHaveTextContent(/\d/);
    expect(screen.getByRole("banner")).not.toHaveTextContent("Sesión");
  });

  it("(c) tras una revisión, la lista y el detalle muestran los datos recibidos", async () => {
    let finish: (review: ReviewResult) => void = () => undefined;
    let request: ReviewRequest | undefined;
    const startReview = vi.fn((received: ReviewRequest) => {
      request = received;
      return new Promise<ReviewResult>((resolve) => {
        finish = resolve;
      });
    });
    renderApp(fakeEngineServices({ reviews: { startReview } }));
    const user = userEvent.setup();

    await user.click(
      within(screen.getByRole("main")).getByRole("button", { name: /Nueva revisión/ }),
    );
    await user.type(screen.getByLabelText("Nombre de la sesión"), "Revisión de prueba");
    await user.upload(screen.getByLabelText("Elegir archivos"), [
      new File(["Contrato No. 1234"], "contrato.txt"),
      new File(["%PDF"], "escaneado.pdf"),
    ]);
    await user.click(screen.getByRole("button", { name: /Leer y comparar 2 archivos/ }));

    // Progreso por archivo mientras el motor lee (SSE).
    act(() => {
      request?.onProgress?.({ kind: "document_started", position: 0, name: "contrato.txt" });
      request?.onProgress?.({
        kind: "document_finished",
        position: 0,
        document: {
          name: "contrato.txt",
          status: "read",
          reason: null,
          fragmentCount: 2,
          method: "text",
          pageCount: null,
        },
      });
    });
    expect(screen.getByRole("heading", { name: "Leyendo 1 de 2 archivos" })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveTextContent("Leyendo 1 de 2 archivos");
    await act(async () => {
      finish(REVIEW);
      await Promise.resolve();
    });

    expect(startReview).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Revisión de prueba" }),
    );
    expect(await screen.findByText("Leído · 2 fragmentos con texto")).toBeInTheDocument();
    expect(screen.getByText("No pudimos leer «escaneado.pdf».")).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "Asistente de IA: No pudo leer un archivo" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Revisar 2 archivos/ }));
    const table = screen.getByRole("table", { name: "Lista de alertas" });
    expect(table).toHaveTextContent("El número de contrato no coincide entre dos documentos");
    expect(table).toHaveTextContent("1324");
    expect(screen.getByText("2 alertas pendientes de 2")).toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveTextContent("Revisión de prueba");

    await user.click(within(table).getAllByRole("row")[2] ?? table);
    const panel = screen.getByRole("group", { name: "Comparar Valor A con Valor B" });
    expect(panel).toHaveTextContent("anexo.pdf");
    expect(panel).toHaveTextContent("Página 3");
    expect(panel).toHaveTextContent("Contrato No. 1324");
  });

  it("con el motor detenido sigue usable y dice qué hacer", async () => {
    const checkHealth = vi.fn(() => Promise.reject(new EngineUnavailableError("/health")));
    renderApp(fakeEngineServices({ checkHealth }));
    await act(() => Promise.resolve());

    const message = screen.getByRole("alert");
    expect(message).toHaveTextContent("El motor de análisis no responde.");
    expect(message).toHaveTextContent("Reintente la conexión.");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar conexión" }));
    expect(checkHealth.mock.calls.length).toBeGreaterThan(1);
    expect(
      within(screen.getByRole("main")).getByRole("button", { name: /Nueva revisión/ }),
    ).toBeEnabled();
  });
});
