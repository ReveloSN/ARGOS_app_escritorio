import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";

describe("Atajos de Nueva revisión", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) Ctrl Enter lee los archivos, como el botón que muestra el atajo", async () => {
    const startReview = vi.fn(() => Promise.resolve(REVIEW));
    renderApp(fakeEngineServices({ reviews: { startReview } }));
    const user = userEvent.setup();
    await user.click(
      within(screen.getByRole("main")).getByRole("button", { name: /Nueva revisión/ }),
    );
    await user.type(screen.getByLabelText("Nombre de la sesión"), "Revisión de prueba");
    await user.upload(screen.getByLabelText("Elegir archivos"), [
      new File(["Contrato No. 1234"], "contrato.txt"),
    ]);

    await user.keyboard("{Control>}{Enter}{/Control}");

    expect(startReview).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Revisión de prueba" }),
    );
  });

  it("(regresión) Ctrl O abre el selector de archivos, como el botón que muestra el atajo", async () => {
    renderApp(fakeEngineServices());
    const user = userEvent.setup();
    await user.click(
      within(screen.getByRole("main")).getByRole("button", { name: /Nueva revisión/ }),
    );
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => undefined);

    await user.keyboard("{Control>}o{/Control}");

    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it("sin archivos Ctrl Enter no hace nada", async () => {
    const startReview = vi.fn(() => Promise.resolve(REVIEW));
    renderApp(fakeEngineServices({ reviews: { startReview } }));
    const user = userEvent.setup();
    await user.click(
      within(screen.getByRole("main")).getByRole("button", { name: /Nueva revisión/ }),
    );

    await user.keyboard("{Control>}{Enter}{/Control}");

    expect(startReview).not.toHaveBeenCalled();
  });
});

describe("Nombre de la sesión obligatorio", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) sin nombre el error se anuncia y el foco va al campo", async () => {
    renderApp(fakeEngineServices());
    const user = userEvent.setup();
    await user.click(
      within(screen.getByRole("main")).getByRole("button", { name: /Nueva revisión/ }),
    );
    await user.upload(screen.getByLabelText("Elegir archivos"), [
      new File(["Contrato No. 1234"], "contrato.txt"),
    ]);

    await user.keyboard("{Control>}{Enter}{/Control}");

    expect(await screen.findByRole("alert")).toHaveTextContent("Escriba un nombre");
    expect(screen.getByLabelText("Nombre de la sesión")).toHaveFocus();
  });
});
