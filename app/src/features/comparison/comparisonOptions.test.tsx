import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ComparisonRequest } from "../../services/engine/comparisonTypes";
import { CASE_CHANGE, comparison, pair, VERSION_CHANGES } from "../../test/comparisonFakes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

async function openComparison() {
  const withCase = comparison({
    pairs: [pair("Contrato_v2.docx", "Contrato_v3.docx", [...VERSION_CHANGES, CASE_CHANGE])],
  });
  const startComparison = vi.fn((request: ComparisonRequest) => {
    request.onProgress?.({ kind: "pair_compared", position: 0, total: 1 });
    return Promise.resolve(withCase);
  });
  renderApp(fakeEngineServices({ comparisons: { startComparison } }));
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: "Comparar dos versiones" }));
  const files = [new File(["a"], "v1.docx"), new File(["b"], "v2.docx")];
  await userEvent.upload(screen.getByLabelText("Elegir documentos"), files);
  return screen.findByRole("button", { name: /^Opciones/ });
}

describe("Opciones de Comparar", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lo secundario va plegado y avisa cuántas opciones hay activas", async () => {
    const options = await openComparison();

    expect(options).toHaveAttribute("aria-expanded", "false");
    expect(options).toHaveTextContent("1 activa");
    expect(screen.queryByRole("checkbox", { name: "mayúsculas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Faltan/ })).not.toBeInTheDocument();
    expect(screen.queryByText("tachado = falta en B")).not.toBeInTheDocument();
  });

  it("al abrirlas ofrece lo que ignorar, los tipos de cambio y la leyenda", async () => {
    const options = await openComparison();

    await userEvent.click(options);

    expect(options).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("checkbox", { name: "mayúsculas" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Solo cambios importantes/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Faltan/ })).toBeInTheDocument();
    expect(screen.getByText("tachado = falta en B")).toBeInTheDocument();
  });
});
