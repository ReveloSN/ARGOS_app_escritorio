import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onlyRows } from "../../test/changeRows";
import { selectedChangeDetail } from "../../test/changeListHarness";
import { comparison, pair, VERSION_CHANGES } from "../../test/comparisonFakes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { required } from "../../test/threeDocuments";

const FIRST = `${"contrato_de_servicios_".repeat(4)}version_a.docx`;
const SECOND = `${"contrato_de_servicios_".repeat(4)}version_b.docx`;

describe("Nombres de archivo largos en Comparar", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) cabecera, ruta y origen del detalle llevan el nombre completo en title", async () => {
    expect(FIRST.length).toBeGreaterThanOrEqual(100);
    const result = comparison({ pairs: [pair(FIRST, SECOND, VERSION_CHANGES)] });
    const startComparison = vi.fn(() => Promise.resolve(result));
    renderApp(fakeEngineServices({ comparisons: { startComparison } }));
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByRole("button", { name: "Comparar dos versiones" }));
    const files = [new File(["a"], "a.docx"), new File(["b"], "b.docx")];
    await userEvent.upload(screen.getByLabelText("Elegir documentos"), files);
    const list = within(await screen.findByRole("list", { name: "Cambios" }));

    expect(screen.getAllByTitle(FIRST).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByTitle(SECOND).length).toBeGreaterThanOrEqual(2);
    expect(
      within(screen.getByRole("navigation", { name: /ruta/i })).getByTitle(
        `${FIRST} frente a ${SECOND}`,
      ),
    ).toBeVisible();
    await userEvent.click(required(onlyRows(list.getAllByRole("button"))[0]));
    expect(selectedChangeDetail().getAllByTitle(FIRST).length).toBeGreaterThan(0);
  });
});
