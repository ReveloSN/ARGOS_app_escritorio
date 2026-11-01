import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { HistoryResult } from "../../services/engine/historyTypes";
import { comparison } from "../../test/comparisonFakes";
import { fakeEngineServices } from "../../test/engineFakes";
import { HISTORY } from "../../test/historyFixtures";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { CLOSED_REVIEW } from "../../test/reviewFixtures";

const WITH_COMPARISON: HistoryResult = {
  ...HISTORY,
  comparisons: [
    {
      id: "c1",
      name: "Arrendamiento Fontibón",
      mode: "versions",
      createdAt: "2026-10-22T10:00:00+00:00",
      documentCount: 2,
      itemCount: 3,
      decidedCount: 1,
    },
  ],
};

async function openHistory(openComparison: ReturnType<typeof vi.fn>) {
  const history = vi.fn(() => Promise.resolve(WITH_COMPARISON));
  const openReview = vi.fn(() => Promise.resolve(CLOSED_REVIEW));
  renderApp(
    fakeEngineServices({
      history: { history },
      reviews: { openReview },
      comparisons: { openComparison },
    }),
  );
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: /Historial/ }));
  return within(await screen.findByRole("list", { name: "Comparaciones del historial" }));
}

describe("Comparaciones en el Historial", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("las lista con sus documentos y cuántos elementos ya se decidieron", async () => {
    const list = await openHistory(vi.fn());

    expect(list.getByText("Arrendamiento Fontibón")).toBeVisible();
    expect(
      list.getByText("2 documentos · 1 de 3 decididos entre cambios e inconsistencias"),
    ).toBeVisible();
    expect(screen.getByText("en 2 sesiones y 1 comparación")).toBeVisible();
  });

  it("«Abrir comparación» la vuelve a abrir en Comparar con sus decisiones", async () => {
    const openComparison = vi.fn(() => Promise.resolve(comparison()));
    const list = await openHistory(openComparison);

    await userEvent.click(list.getByRole("button", { name: /Abrir comparación «/ }));

    expect(openComparison).toHaveBeenCalledWith("c1");
    expect(await screen.findByRole("heading", { name: "Comparar documentos" })).toBeVisible();
  });

  it("(regresión) si no se puede abrir, lo explica en 3 partes y permite reintentar", async () => {
    const openComparison = vi
      .fn<(id: string) => Promise<ReturnType<typeof comparison>>>()
      .mockRejectedValueOnce(new Error("sin respuesta"))
      .mockResolvedValue(comparison());
    const list = await openHistory(openComparison);

    await userEvent.click(list.getByRole("button", { name: /Abrir comparación «/ }));

    expect(await screen.findByText("No pudimos abrir esta comparación.")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "Comparar documentos" })).toBeVisible();
  });
});
