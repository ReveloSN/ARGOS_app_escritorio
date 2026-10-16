import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { HistoryRecordResult, HistoryResult } from "../../services/engine/historyTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { CLOSED_REVIEW, REVIEW } from "../../test/reviewFixtures";

const HISTORY: HistoryResult = {
  metrics: {
    sessionCount: 2,
    resolvedAlerts: 3,
    realErrorCount: 1,
    realErrorRate: 1 / 3,
    meanReviewSeconds: 400,
  },
  sessions: [
    {
      id: "s-1",
      name: "Revisión de prueba",
      createdAt: REVIEW.session.createdAt,
      closedAt: CLOSED_REVIEW.session.closedAt,
      status: "closed",
      documentCount: 3,
      alertCount: 2,
      decidedCount: 1,
    },
    {
      id: "s-2",
      name: "Contrato sin diferencias",
      createdAt: REVIEW.session.createdAt,
      closedAt: null,
      status: "in_progress",
      documentCount: 2,
      alertCount: 0,
      decidedCount: 0,
    },
  ],
};

const RECORD: HistoryRecordResult = {
  sessionName: "Revisión de prueba",
  sessionCreatedAt: REVIEW.session.createdAt,
  alertNumber: 1,
  risk: "high",
  entityType: "contract_id",
  firstValue: "1234",
  secondValue: "1324",
  decision: "error",
  correctSide: "first",
  decidedAt: "2026-10-15T10:10:00+00:00",
};

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.readAsText(blob);
  });
}

async function openHistory() {
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: /Historial/ }));
}

describe("Historial", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("muestra las métricas, las sesiones y las decisiones de la seleccionada", async () => {
    const history = vi.fn(() => Promise.resolve(HISTORY));
    const openReview = vi.fn(() => Promise.resolve(CLOSED_REVIEW));
    renderApp(fakeEngineServices({ history: { history }, reviews: { openReview } }));
    await openHistory();

    expect(await screen.findByText("Alertas resueltas")).toBeInTheDocument();
    expect(screen.getByText("en 2 sesiones")).toBeInTheDocument();
    expect(screen.getByText("6 min 40 s")).toBeInTheDocument();
    expect(screen.getByText("1 de 3 · el resto fue «Es correcto» o «Ignorar»")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Sesiones del historial" });
    expect(table).toHaveTextContent("1 de 2");
    expect(table).toHaveTextContent("—");
    expect(table).toHaveTextContent("En curso");

    const aside = await screen.findByRole("complementary", { name: "Decisiones de la sesión" });
    expect(within(aside).getByText("Valor correcto: 1234")).toBeInTheDocument();
    expect(history).toHaveBeenCalledWith(30);
    expect(openReview).toHaveBeenCalledWith("s-1");
  });

  it("cambia de periodo y abre la revisión elegida", async () => {
    const history = vi.fn(() => Promise.resolve(HISTORY));
    const openReview = vi.fn(() => Promise.resolve(CLOSED_REVIEW));
    renderApp(fakeEngineServices({ history: { history }, reviews: { openReview } }));
    await openHistory();

    await userEvent.selectOptions(await screen.findByRole("combobox", { name: "Periodo" }), "7");
    expect(history).toHaveBeenLastCalledWith(7);
    await userEvent.click(await screen.findByRole("button", { name: /Abrir revisión/ }));

    expect(await screen.findByRole("table", { name: "Lista de alertas" })).toBeInTheDocument();
    expect(screen.getByText("Cerrada · solo lectura")).toBeInTheDocument();
  });

  it("exporta el registro del periodo como CSV", async () => {
    const records = vi.fn(() => Promise.resolve([RECORD]));
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:registro");
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    renderApp(
      fakeEngineServices({
        history: { history: () => Promise.resolve(HISTORY), records },
        reviews: { openReview: () => Promise.resolve(CLOSED_REVIEW) },
      }),
    );
    await openHistory();

    await userEvent.click(await screen.findByRole("button", { name: /Exportar registro/ }));

    await vi.waitFor(() => {
      expect(click).toHaveBeenCalled();
    });
    const csv = await readBlob(createObjectURL.mock.calls[0]?.[0] ?? new Blob());
    expect(csv).toContain('"Sesión";"Fecha de la sesión";"Alerta"');
    expect(csv).toContain('"Revisión de prueba"');
    expect(csv).toContain('"Es un error";"1234"');
    click.mockRestore();
  });

  it("si el motor no responde, lo dice y permite reintentar", async () => {
    const history = vi.fn().mockRejectedValueOnce(new Error("detenido")).mockResolvedValue(HISTORY);
    renderApp(
      fakeEngineServices({
        history: { history },
        reviews: { openReview: () => Promise.resolve(CLOSED_REVIEW) },
      }),
    );
    await openHistory();

    expect(await screen.findByText("No pudimos cargar el historial.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(
      await screen.findByRole("table", { name: "Sesiones del historial" }),
    ).toBeInTheDocument();
  });

  it("sin revisiones en el periodo invita a crear una", async () => {
    const empty: HistoryResult = { ...HISTORY, sessions: [] };
    renderApp(fakeEngineServices({ history: { history: () => Promise.resolve(empty) } }));
    await openHistory();

    expect(
      await screen.findByRole("heading", { name: "No hay revisiones en este periodo" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar registro/ })).toBeDisabled();
  });
});
