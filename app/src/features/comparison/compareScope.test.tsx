import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import {
  comparison,
  NUMBER_CHANGE,
  pair,
  REMOVED_ANNEX_CHANGE,
  VERSION_CHANGES,
} from "../../test/comparisonFakes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Falta un elemento que la prueba necesita.");
  return value;
}

const V2 = "Contrato_v2.docx";
const V3 = "Contrato_v3.docx";
const ANNEX = "Anexo.pdf";
const DECIDED = {
  decisions: [{ alertNumber: 1, kind: "error" as const, correctSide: null, decidedAt: "" }],
  canUndo: true,
};

// Tres documentos comparados todos contra todos, como lo hace el motor con tres o más archivos.
const THREE: ComparisonResult = (() => {
  const base = comparison();
  return comparison({
    mode: "contract_annexes",
    documents: [
      ...base.documents,
      { ...required(base.documents[0]), name: ANNEX, fragmentCount: 2 },
    ],
    pairs: [
      pair(V2, V3, VERSION_CHANGES),
      pair(V2, ANNEX, [{ ...REMOVED_ANNEX_CHANGE, number: 6 }]),
      pair(V3, ANNEX, [{ ...NUMBER_CHANGE, number: 7 }]),
    ],
  });
})();

async function openThree(decide = vi.fn(() => Promise.resolve(DECIDED))) {
  const startComparison = vi.fn(() => Promise.resolve(THREE));
  renderApp(fakeEngineServices({ comparisons: { startComparison, decide } }));
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: "Comparar dos versiones" }));
  const files = ["a", "b", "c"].map((name) => new File(["texto"], `${name}.docx`));
  await userEvent.upload(screen.getByLabelText("Elegir documentos"), files);
  await screen.findByRole("heading", { name: "Comparar documentos" });
  return { decide };
}

async function openVersions() {
  await userEvent.click(screen.getByRole("tab", { name: /Comparar versiones/ }));
}

describe("Comparar un documento contra todos", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("elige el documento base y contra cuál se compara", async () => {
    await openThree();
    await openVersions();

    const base = screen.getByRole("combobox", { name: "Documento base" });
    const against = screen.getByRole("combobox", { name: "Contra" });

    expect(
      within(base)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([V2, V3, ANNEX]);
    expect(within(against).getAllByRole("option")[0]).toHaveTextContent(
      "Todos los demás documentos",
    );
    await userEvent.selectOptions(against, ANNEX);

    const list = screen.getByRole("list", { name: "Cambios" });
    expect(within(list).getAllByRole("button")).toHaveLength(1);
    expect(within(list).queryByText(/^contra /)).not.toBeInTheDocument();
  });

  it("con «Todos» junta los cambios de todos los documentos, cada uno con su documento", async () => {
    await openThree();
    await openVersions();

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Contra" }),
      "Todos los demás documentos",
    );

    const list = screen.getByRole("list", { name: "Cambios" });
    expect(within(list).getAllByRole("button")).toHaveLength(5);
    expect(within(list).getAllByText(`contra ${V3}`)).toHaveLength(4);
    expect(within(list).getByText(`contra ${ANNEX}`)).toBeInTheDocument();
    const breakdown = screen.getByRole("table");
    expect(within(breakdown).getByRole("rowheader", { name: V3 })).toBeInTheDocument();
    expect(within(breakdown).getByRole("rowheader", { name: ANNEX })).toBeInTheDocument();
  });

  it("se filtra la lista por documento", async () => {
    await openThree();
    await openVersions();
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Contra" }),
      "Todos los demás documentos",
    );

    const filters = screen.getByRole("group", { name: "Filtrar por documento" });
    await userEvent.click(within(filters).getByRole("button", { name: new RegExp(ANNEX) }));

    const list = screen.getByRole("list", { name: "Cambios" });
    expect(within(list).getAllByRole("button")).toHaveLength(1);
    expect(within(list).getByText(`contra ${ANNEX}`)).toBeInTheDocument();
  });

  it("en la matriz, el encabezado de un documento lo abre contra todos y la celda abre el par", async () => {
    await openThree();
    expect(screen.getByRole("tab", { name: /Matriz/ })).toHaveAttribute("aria-selected", "true");

    const headers = screen.getAllByRole("button", {
      name: `Comparar ${ANNEX} contra todos los demás`,
    });
    await userEvent.click(required(headers[0]));

    expect(screen.getByRole("combobox", { name: "Documento base" })).toHaveValue(ANNEX);
    expect(screen.getByRole("combobox", { name: "Contra" })).toHaveDisplayValue(
      "Todos los demás documentos",
    );

    await userEvent.click(screen.getByRole("tab", { name: /Matriz/ }));
    const cells = screen.getAllByRole("gridcell").filter((cell) => cell.tagName === "BUTTON");
    await userEvent.click(required(cells[0]));
    await userEvent.click(screen.getByRole("button", { name: /Abrir el par/ }));
    expect(screen.getByRole("combobox", { name: "Contra" })).not.toHaveDisplayValue(
      "Todos los demás documentos",
    );
  });
});

describe("Cerrar la comparación", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("vuelve a elegir qué comparar sin perder las decisiones y se puede reabrir", async () => {
    const { decide } = await openThree();
    await openVersions();
    await userEvent.keyboard("e");
    expect(decide).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /Cerrar comparación/ }));

    expect(screen.getByText("Elija dos o más documentos")).toBeInTheDocument();
    const recent = screen.getByRole("button", { name: /Abrir comparación/ });
    await userEvent.click(recent);
    await openVersions();
    expect(
      within(screen.getByRole("list", { name: "Cambios" })).getByText("Es un error"),
    ).toBeVisible();
  });

  it("Esc también la cierra", async () => {
    await openThree();

    await userEvent.keyboard("{Escape}");

    expect(screen.getByText("Elija dos o más documentos")).toBeInTheDocument();
  });
});
