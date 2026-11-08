import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DecisionsResult } from "../../services/engine/reviewTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";

const DECIDED_AT = "2026-10-15T10:05:00+00:00";
const decidedAs = (kind: "correct" | "error"): DecisionsResult => ({
  decisions: [{ alertNumber: 1, kind, correctSide: null, decidedAt: DECIDED_AT }],
  canUndo: true,
});

/** Los botones de decisión del detalle son los únicos con estado pulsado. */
function decisionButton(name: RegExp): HTMLElement {
  const button = screen
    .getAllByRole("button", { name })
    .find((candidate) => candidate.hasAttribute("aria-pressed"));
  if (!button) throw new Error(`No hay botón de decisión ${String(name)}`);
  return button;
}

/** Cada decisión queda pendiente hasta que la prueba decide en qué orden responde el motor. */
function deferredDecisions() {
  const pending: ((result: DecisionsResult) => void)[] = [];
  const decide = vi.fn(
    () =>
      new Promise<DecisionsResult>((resolve) => {
        pending.push(resolve);
      }),
  );
  const answer = async (call: number, result: DecisionsResult) => {
    await act(async () => {
      pending[call]?.(result);
      await Promise.resolve();
    });
  };
  return { decide, answer };
}

describe("Decisiones cuyas respuestas llegan en otro orden", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) la pantalla muestra lo último que se decidió, no la respuesta más lenta", async () => {
    const { decide, answer } = deferredDecisions();
    renderApp(fakeEngineServices({ reviews: { decide } }), REVIEW);
    await act(() => Promise.resolve());
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Expediente/ }));
    const table = screen.getByRole("table", { name: "Lista de alertas" });
    await user.click(within(table).getAllByRole("row")[2] ?? table);

    await user.click(decisionButton(/Es correcto/));
    await user.click(decisionButton(/Es un error/));
    await answer(1, decidedAs("error"));
    await answer(0, decidedAs("correct"));

    expect(decide).toHaveBeenCalledTimes(2);
    expect(decisionButton(/Es un error/)).toHaveAttribute("aria-pressed", "true");
  });

  it("(regresión) decidir otra alerta no oculta el fallo de la anterior", async () => {
    const settle: { resolve: (r: DecisionsResult) => void; reject: (e: Error) => void }[] = [];
    const decide = vi.fn(
      () =>
        new Promise<DecisionsResult>((resolve, reject) => {
          settle.push({ resolve, reject });
        }),
    );
    renderApp(fakeEngineServices({ reviews: { decide } }), REVIEW);
    await act(() => Promise.resolve());
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Expediente/ }));
    const table = screen.getByRole("table", { name: "Lista de alertas" });
    await user.click(within(table).getAllByRole("row")[2] ?? table);

    await user.keyboard("e");
    await user.keyboard("j");
    await user.keyboard("e");
    expect(decide).toHaveBeenCalledTimes(2);
    await act(async () => {
      settle[1]?.resolve(decidedAs("error"));
      settle[0]?.reject(new Error("sin respuesta"));
      await Promise.resolve();
    });

    expect(await screen.findByText("No se guardó la decisión sobre la Alerta 1.")).toBeVisible();
  });

  it("(regresión) si la última decisión falla, la anterior que sí se guardó se ve guardada", async () => {
    const settle: { resolve: (r: DecisionsResult) => void; reject: (e: Error) => void }[] = [];
    const decide = vi.fn(
      () =>
        new Promise<DecisionsResult>((resolve, reject) => {
          settle.push({ resolve, reject });
        }),
    );
    renderApp(fakeEngineServices({ reviews: { decide } }), REVIEW);
    await act(() => Promise.resolve());
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Expediente/ }));
    const table = screen.getByRole("table", { name: "Lista de alertas" });
    await user.click(within(table).getAllByRole("row")[2] ?? table);

    await user.keyboard("e");
    await user.keyboard("j");
    await user.keyboard("e");
    await act(async () => {
      settle[1]?.reject(new Error("sin respuesta"));
      settle[0]?.resolve(decidedAs("error"));
      await Promise.resolve();
    });

    expect(await screen.findByText("No se guardó la decisión sobre la Alerta 2.")).toBeVisible();
    const sidebar = within(screen.getByRole("navigation", { name: "Navegación principal" }));
    expect(sidebar.getByText("1 alerta pendiente de 2")).toBeInTheDocument();
  });
});
