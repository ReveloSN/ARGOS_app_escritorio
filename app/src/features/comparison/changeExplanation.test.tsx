import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ChangeExplanationResult } from "../../services/engine/aiTypes";
import { comparison } from "../../test/comparisonFakes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

const TEMPLATE: ChangeExplanationResult = {
  source: "template",
  parts: [{ key: "changeExplanation.number", params: {}, count: null }],
  text: "",
  fallbackReason: null,
};

async function openFirstChange(explainChange: () => Promise<ChangeExplanationResult>) {
  const startComparison = vi.fn(() => Promise.resolve(comparison()));
  renderApp(fakeEngineServices({ comparisons: { startComparison }, ai: { explainChange } }));
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: "Comparar dos versiones" }));
  await userEvent.upload(screen.getByLabelText("Elegir documentos"), [
    new File(["a"], "v1.docx"),
    new File(["b"], "v2.docx"),
  ]);
  await screen.findByRole("heading", { name: "Comparar documentos" });
}

describe("Explicar este cambio", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("muestra la sugerencia de sentido en la lista, rotulada como IA", async () => {
    await openFirstChange(() => Promise.resolve(TEMPLATE));

    const list = within(screen.getByRole("list", { name: "Cambios" }));
    expect(list.getAllByText("IA: Cambio de sentido").length).toBeGreaterThan(0);
  });

  it("pide la explicación solo al abrirla y la muestra con su origen", async () => {
    const explainChange = vi.fn(() => Promise.resolve(TEMPLATE));
    await openFirstChange(explainChange);
    expect(explainChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Explicar este cambio" }));

    expect(explainChange).toHaveBeenCalledWith("c1", 1, "es");
    expect(await screen.findByText("Explicación de ARGUS")).toBeInTheDocument();
    expect(screen.getByText(/Cambia un número o identificador/)).toBeInTheDocument();
    expect(screen.getByText(/Contrato_v3.docx · /)).toBeInTheDocument();
  });

  it("rotula el texto del modelo como «Sugerencia de IA»", async () => {
    const fromAi = { ...TEMPLATE, source: "ai" as const, text: "Cambia el número del contrato." };
    await openFirstChange(() => Promise.resolve(fromAi));

    await userEvent.click(screen.getByRole("button", { name: "Explicar este cambio" }));

    expect(await screen.findByText("Sugerencia de IA")).toBeInTheDocument();
    expect(screen.getByText("Cambia el número del contrato.")).toBeInTheDocument();
  });

  it("si la IA no pudo responder, dice por qué y usa la explicación local", async () => {
    const fallback = { ...TEMPLATE, fallbackReason: "invalid_key" as const };
    await openFirstChange(() => Promise.resolve(fallback));

    await userEvent.click(screen.getByRole("button", { name: "Explicar este cambio" }));

    expect(await screen.findByText(/El proveedor rechazó la clave/)).toBeInTheDocument();
    expect(screen.getByText("Explicación de ARGUS")).toBeInTheDocument();
  });
});
