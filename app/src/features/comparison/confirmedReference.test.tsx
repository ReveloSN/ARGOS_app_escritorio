import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { comparison } from "../../test/comparisonFakes";
import { fakeEngineServices } from "../../test/engineFakes";
import { confirmedFact, factsResult } from "../../test/factFakes";
import { inconsistency } from "../../test/inconsistencyFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";

async function openInconsistencies(facts: ReturnType<typeof factsResult>) {
  const result = comparison({ inconsistencies: [inconsistency(5)] });
  const startComparison = vi.fn(() => Promise.resolve(result));
  const listFacts = vi.fn(() => Promise.resolve(facts));
  renderApp(fakeEngineServices({ comparisons: { startComparison }, facts: { listFacts } }), REVIEW);
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: "Comparar dos versiones" }));
  const files = [new File(["a"], "v1.docx"), new File(["b"], "v2.docx")];
  await userEvent.upload(screen.getByLabelText("Elegir documentos"), files);
  await screen.findByRole("heading", { name: "Comparar documentos" });
  await userEvent.keyboard("2");
  await screen.findByRole("table");
  return listFacts;
}

describe("Inconsistencias frente al dato confirmado del expediente", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) usa el dato confirmado como referencia en vez de decir que no hay ninguno", async () => {
    const listFacts = await openInconsistencies(factsResult({ facts: [confirmedFact()] }));

    expect(listFacts).toHaveBeenCalledWith(REVIEW.session.id);
    expect(await screen.findByText("Confirmado: 4857")).toBeVisible();
    expect(screen.queryByText("Sin dato confirmado")).not.toBeInTheDocument();
    expect(screen.queryByText(/Todavía no hay datos confirmados/)).not.toBeInTheDocument();
    expect(screen.getByText(/no coincide con el dato confirmado del expediente/)).toBeVisible();
  });

  it("sin datos confirmados lo dice, como antes", async () => {
    await openInconsistencies(factsResult({ facts: [], pending: [] }));

    expect(await screen.findByText("Sin dato confirmado")).toBeVisible();
    expect(screen.getByText(/Todavía no hay datos confirmados del expediente/)).toBeVisible();
  });
});
