import { act, screen, within } from "@testing-library/react";
import { onlyRows } from "../../test/changeRows";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { required } from "../../test/threeDocuments";
import { comparison, NUMBER_CHANGE, pair, VERSION_CHANGES } from "../../test/comparisonFakes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

async function openChanges() {
  const result = comparison({
    pairs: [pair("Contrato_v2.docx", "Contrato_v3.docx", VERSION_CHANGES)],
  });
  const startComparison = vi.fn(() => Promise.resolve(result));
  renderApp(fakeEngineServices({ comparisons: { startComparison } }));
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: "Comparar dos versiones" }));
  const files = [new File(["a"], "v1.docx"), new File(["b"], "v2.docx")];
  await userEvent.upload(screen.getByLabelText("Elegir documentos"), files);
  return within(await screen.findByRole("list", { name: "Cambios" }));
}

describe("Lista de cambios de Comparar", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) solo el riesgo alto lleva marca, y la marca tiene nombre: nunca solo color", async () => {
    const list = await openChanges();

    const rows = list.getAllByRole("listitem");
    expect(rows.map((row) => within(row).queryAllByRole("img").length)).toEqual([1, 1, 1, 0]);
    expect(within(required(rows[0])).getByRole("img", { name: "Riesgo alto" })).toBeVisible();
    expect(list.queryByText(/^(Alto|Medio|Bajo)$/)).not.toBeInTheDocument();
  });

  it("los de riesgo alto van primero y J K recorren la lista en ese orden", async () => {
    const list = await openChanges();
    const current = () =>
      onlyRows(list.getAllByRole("button")).findIndex((row) => row.ariaCurrent === "true");

    expect(onlyRows(list.getAllByRole("button"))).toHaveLength(4);
    expect(onlyRows(list.getAllByRole("button"))[0]).toHaveAccessibleName(/4857 → 4587/);
    await userEvent.keyboard("jj");
    expect(current()).toBe(2);
    await userEvent.keyboard("j");
    expect(current()).toBe(3);
    await userEvent.keyboard("k");
    expect(current()).toBe(2);
  });

  it("(regresión) el caso 4857 contra 4587 se nota como riesgo alto sin leer ninguna etiqueta", async () => {
    const list = await openChanges();

    expect(NUMBER_CHANGE.risk).toBe("high");
    const first = required(onlyRows(list.getAllByRole("button"))[0]);
    expect(within(first).getByRole("img", { name: "Riesgo alto" })).toBeVisible();
    const removed = screen.getByText("4857", { selector: "del" });
    const added = required(screen.getByText("4587", { selector: "ins" }));
    expect(removed.className).toMatch(/highRisk/);
    expect(added.className).toMatch(/highRisk/);
  });

  it("un solo control, «Todos / Solo importantes», con sus conteos y las flechas", async () => {
    const list = await openChanges();
    const all = screen.getByRole("radio", { name: "Todos 4" });

    expect(screen.getAllByRole("radiogroup")).toHaveLength(1);
    expect(screen.getByRole("radio", { name: "Solo importantes 3" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
    all.focus();
    await userEvent.keyboard("{ArrowRight}");

    expect(screen.getByRole("radio", { name: "Solo importantes 3" })).toHaveFocus();
    expect(onlyRows(list.getAllByRole("button"))).toHaveLength(3);
    await userEvent.click(all);
    expect(onlyRows(list.getAllByRole("button"))).toHaveLength(4);
  });

  it("el detalle se abre bajo la fila elegida y es el único lugar con el nivel completo de riesgo", async () => {
    const list = await openChanges();
    const rows = onlyRows(list.getAllByRole("button"));

    await userEvent.click(required(rows[0]));

    const item = required(list.getAllByRole("listitem")[0]);
    const detail = within(item).getByRole("region", { name: /Explicación del cambio/ });
    expect(within(item).getByText(/Riesgo alto/)).toBeVisible();
    expect(within(detail).getByText("Documento A dice")).toBeVisible();
    expect(within(detail).getByText("Documento B dice")).toBeVisible();
    expect(screen.queryByText(/^(Antes|Ahora)$/)).not.toBeInTheDocument();
    expect(list.getAllByText(/Riesgo alto/)).toHaveLength(1);
    expect(within(detail).getByRole("button", { name: /Es correcto/ })).toBeVisible();
    expect(within(detail).getByRole("button", { name: /Ver detalle/ })).toBeVisible();
  });

  it("cada valor del detalle dice de qué archivo y de qué página o sección sale", async () => {
    const list = await openChanges();
    await userEvent.click(required(onlyRows(list.getAllByRole("button"))[0]));

    const cards = list.getAllByRole("region", { name: /Documento [AB] dice: / });
    expect(cards).toHaveLength(2);
    cards.forEach((card) => {
      expect(within(card).getByText(/\.docx$/)).toBeVisible();
      expect(
        within(card).getByText(/^(Página|Párrafo|Sección|Línea|Fila|Celda|Asunto|Cuerpo)/),
      ).toBeVisible();
    });
  });
});
