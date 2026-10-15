import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { EngineServicesContext } from "./features/engine/EngineServicesContext";
import { ReviewProvider } from "./features/review/ReviewProvider";
import { ThemeProvider } from "./features/settings/theme/ThemeProvider";
import { I18nProvider } from "./i18n/I18nProvider";
import { EngineUnavailableError, type EngineHealth } from "./services/engine/engineClient";
import { EngineStatusMonitor } from "./services/engine/engineStatusMonitor";
import type { ReviewResult, ReviewStarter } from "./services/engine/reviewTypes";

const HEALTHY: EngineHealth = { status: "ok", version: "1" };

// Respuesta simulada del motor, con la forma real de POST /reviews.
const REVIEW_RESULT: ReviewResult = {
  session: { id: "s-1", name: "Revisión de prueba", createdAt: "2026-10-15T10:00:00+00:00" },
  documents: [
    { name: "contrato.txt", status: "read", reason: null, fragmentCount: 2 },
    { name: "escaneado.pdf", status: "unreadable", reason: "no_text", fragmentCount: 0 },
  ],
  alerts: [
    {
      number: 1,
      risk: "high",
      entityType: "contract_id",
      differenceKind: "transposition",
      confidence: 0.95,
      highlightPositions: [2, 3],
      first: {
        value: "1234",
        normalizedValue: "1234",
        occurrences: [
          {
            document: "contrato.txt",
            location: { kind: "line", line: 1 },
            excerpt: "Contrato No. 1234",
          },
        ],
      },
      second: {
        value: "1324",
        normalizedValue: "1324",
        occurrences: [
          {
            document: "anexo.txt",
            location: { kind: "line", line: 3 },
            excerpt: "Contrato No. 1324",
          },
        ],
      },
    },
  ],
};

function renderApp(checkHealth: () => Promise<EngineHealth>, reviewStarter: ReviewStarter) {
  const statusMonitor = new EngineStatusMonitor({ checkHealth });
  render(
    <I18nProvider>
      <ThemeProvider>
        <EngineServicesContext.Provider value={{ statusMonitor, reviewStarter }}>
          <ReviewProvider>
            <App />
          </ReviewProvider>
        </EngineServicesContext.Provider>
      </ThemeProvider>
    </I18nProvider>,
  );
}

const neverReviews: ReviewStarter = { startReview: vi.fn() };

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

  it("(a) al iniciar sin revisión muestra Inicio vacío, sin alertas ni contadores", async () => {
    renderApp(() => Promise.resolve(HEALTHY), neverReviews);
    await act(() => Promise.resolve());

    expect(screen.getByRole("heading", { name: "Todavía no hay revisiones" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /Comparar/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Sesión activa")).not.toBeInTheDocument();
    expect(screen.queryByText(/pendiente/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Revisión actual/ })).not.toHaveTextContent(/\d/);
    expect(screen.getByRole("banner")).not.toHaveTextContent("Sesión");
  });

  it("(c) tras una revisión, la lista y el detalle muestran los datos recibidos", async () => {
    const startReview = vi.fn(() => Promise.resolve(REVIEW_RESULT));
    renderApp(() => Promise.resolve(HEALTHY), { startReview });
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

    expect(startReview).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Revisión de prueba" }),
    );
    expect(await screen.findByText("Leído · 2 fragmentos con texto")).toBeInTheDocument();
    expect(screen.getByText("No pudimos leer «escaneado.pdf».")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Revisar 1 archivo/ }));
    const table = screen.getByRole("table", { name: "Lista de alertas" });
    expect(table).toHaveTextContent("El número de contrato no coincide entre dos documentos");
    expect(table).toHaveTextContent("1324");
    expect(screen.getByText("1 alerta pendiente de 1")).toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveTextContent("Revisión de prueba");

    await user.click(within(table).getAllByRole("row")[1] ?? table);
    const panel = screen.getByRole("group", { name: "Comparar Valor A con Valor B" });
    expect(panel).toHaveTextContent("contrato.txt");
    expect(panel).toHaveTextContent("Línea 3");
    expect(panel).toHaveTextContent("Contrato No. 1324");
  });

  it("con el motor detenido sigue usable y dice qué hacer", async () => {
    const checkHealth = vi.fn(() => Promise.reject(new EngineUnavailableError("/health")));
    renderApp(checkHealth, neverReviews);
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
