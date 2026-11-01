import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { comparison } from "../../test/comparisonFakes";
import { fakeEngineServices } from "../../test/engineFakes";
import { inconsistency } from "../../test/inconsistencyFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

async function openInconsistencies(count: number) {
  const found = Array.from({ length: count }, (_, index) => inconsistency(index + 5));
  const result = comparison({ inconsistencies: found });
  const startComparison = vi.fn(() => Promise.resolve(result));
  renderApp(fakeEngineServices({ comparisons: { startComparison } }));
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: "Comparar dos versiones" }));
  const files = [new File(["a"], "v1.docx"), new File(["b"], "v2.docx")];
  await userEvent.upload(screen.getByLabelText("Elegir documentos"), files);
  await screen.findByRole("heading", { name: "Comparar documentos" });
  await userEvent.keyboard("2");
}

describe("Textos con conteo", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) un solo dato dice «1 dato no coincide», no «1 datos»", async () => {
    await openInconsistencies(1);

    expect(screen.getByText(/^1 dato no coincide en \d+ documentos?\./)).toBeVisible();
    expect(screen.queryByText(/1 datos/)).not.toBeInTheDocument();
  });

  it("varios datos van en plural", async () => {
    await openInconsistencies(2);

    expect(screen.getByText(/^2 datos no coinciden en \d+ documentos?\./)).toBeVisible();
  });
});
