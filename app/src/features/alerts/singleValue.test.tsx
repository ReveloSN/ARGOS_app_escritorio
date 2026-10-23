import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AlertResult, DecisionsResult } from "../../services/engine/reviewTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";

const IMPOSSIBLE_DATE: AlertResult = {
  number: 1,
  risk: "high",
  entityType: "date",
  differenceKind: "impossible_date",
  confidence: 0.99,
  highlightPositions: [],
  first: {
    value: "31/02/2026",
    normalizedValue: "31/02/2026",
    occurrences: [
      {
        document: "Contrato.docx",
        location: { kind: "paragraph", paragraph: 4 },
        excerpt: "Entrega el 31/02/2026.",
      },
    ],
  },
  second: null,
  explanation: [
    {
      key: "explanation.internal.impossible_date",
      params: { document: "Contrato.docx", first: "31/02/2026", second: "" },
      count: null,
    },
  ],
};
const SINGLE_REVIEW = { ...REVIEW, alerts: [IMPOSSIBLE_DATE] };
const MARKED_AS_ERROR: DecisionsResult = {
  decisions: [
    { alertNumber: 1, kind: "error", correctSide: null, decidedAt: "2026-10-15T10:05:00+00:00" },
  ],
  canUndo: true,
};

async function openList() {
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: /^Expediente/ }));
  return within(screen.getByRole("table", { name: "Lista de alertas" }));
}

describe("Alertas de un solo valor (verificaciones internas)", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("la lista muestra el título de la verificación y no ofrece silenciar el par", async () => {
    renderApp(fakeEngineServices(), SINGLE_REVIEW);
    const table = await openList();

    expect(table.getByText("Una fecha no existe en el calendario")).toBeInTheDocument();
    expect(table.getByText("—")).toBeInTheDocument();
    await userEvent.click(table.getByRole("button", { name: "Acciones" }));
    expect(screen.getByRole("menuitem", { name: /Copiar/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /No alertar casos similares/ }),
    ).not.toBeInTheDocument();
  });

  it("el detalle muestra solo el Valor A y «Es un error» no pregunta cuál es el correcto", async () => {
    const decide = vi.fn(() => Promise.resolve(MARKED_AS_ERROR));
    renderApp(fakeEngineServices({ reviews: { decide } }), SINGLE_REVIEW);
    const table = await openList();
    await userEvent.click(table.getAllByRole("row")[2] ?? document.body);

    expect(screen.getByRole("region", { name: "Valor A" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Valor B" })).not.toBeInTheDocument();
    expect(
      screen.getByText("En «Contrato.docx», la fecha 31/02/2026 no existe en el calendario."),
    ).toBeInTheDocument();
    await userEvent.keyboard("e");
    expect(decide).toHaveBeenCalledWith(REVIEW.session.id, { alertNumber: 1, kind: "error" });
    expect(screen.queryByRole("group", { name: /cuál es el correcto/i })).not.toBeInTheDocument();
  });
});
