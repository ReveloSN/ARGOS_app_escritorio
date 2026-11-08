import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { comparison, pair, VERSION_CHANGES } from "./comparisonFakes";
import { fakeEngineServices } from "./engineFakes";
import { renderApp } from "./renderApp";

export const DECIDED_FIRST = {
  decisions: [{ alertNumber: 1, kind: "correct" as const, correctSide: null, decidedAt: "" }],
  canUndo: true,
};

export const ALL_DECIDED = {
  decisions: [1, 2, 3, 4].map((alertNumber) => ({
    ...DECIDED_FIRST.decisions[0],
    alertNumber,
  })),
  canUndo: true,
};

/** El botón seleccionado conecta la lista con el detalle mediante aria-controls. */
export function selectedChangeDetail() {
  const list = within(screen.getByRole("list", { name: "Cambios" }));
  const selected = list.getAllByRole("button").find((button) => button.ariaCurrent === "true");
  const panel = document.getElementById(selected?.getAttribute("aria-controls") ?? "");
  if (!panel) throw new Error("El cambio seleccionado no está conectado con su detalle.");
  return within(panel);
}

export async function openChanges(decided = DECIDED_FIRST) {
  const result = comparison({
    pairs: [pair("Contrato_v2.docx", "Contrato_v3.docx", VERSION_CHANGES)],
  });
  const startComparison = vi.fn(() => Promise.resolve(result));
  const decide = vi.fn(() => Promise.resolve(decided));
  renderApp(fakeEngineServices({ comparisons: { startComparison, decide } }));
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: "Comparar dos versiones" }));
  const files = [new File(["a"], "v1.docx"), new File(["b"], "v2.docx")];
  await userEvent.upload(screen.getByLabelText("Elegir documentos"), files);
  return within(await screen.findByRole("list", { name: "Cambios" }));
}
