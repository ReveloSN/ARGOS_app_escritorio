import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onlyRows } from "../../test/changeRows";
import { ALL_DECIDED, DECIDED_FIRST, openChanges } from "../../test/changeListHarness";
import { stubBrowser } from "../../test/renderApp";
import { required } from "../../test/threeDocuments";

describe("Decisiones en la lista de cambios", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) el orden de las decisiones no cambia con el riesgo e «Ignorar» pesa menos y avisa su efecto", async () => {
    const list = await openChanges();
    await userEvent.click(required(onlyRows(list.getAllByRole("button"))[0]));

    const group = within(list.getByRole("group", { name: /./ }));
    const names = group.getAllByRole("button").map((button) => button.textContent ?? "");
    expect(names.map((name) => name.replace(/s.$/, ""))).toEqual([
      expect.stringMatching(/Es correcto/),
      expect.stringMatching(/Es un error/),
      expect.stringMatching(/Ignorar/),
    ]);
    expect(group.getByText("Sobre este cambio")).toBeVisible();
    expect(group.getByRole("button", { name: /Ignorar/ })).toHaveAttribute(
      "title",
      expect.stringContaining("queda marcada como ignorada"),
    );
  });

  it("(regresión) la cabecera de la lista cuenta cuántos cambios van decididos", async () => {
    const list = await openChanges();
    expect(screen.getByText("0 de 4 decididos")).toBeVisible();

    await userEvent.click(required(onlyRows(list.getAllByRole("button"))[0]));
    await userEvent.click(list.getByRole("button", { name: /Es correcto/ }));

    expect(await screen.findByText("1 de 4 decididos")).toBeVisible();
  });

  it("(regresión) con todos decididos la cabecera dice que la revisión está completa", async () => {
    const list = await openChanges(ALL_DECIDED as typeof DECIDED_FIRST);

    await userEvent.click(required(onlyRows(list.getAllByRole("button"))[0]));
    await userEvent.click(list.getByRole("button", { name: /Es correcto/ }));

    expect(await screen.findByText("Revisión completa · 4 de 4")).toBeVisible();
  });
});
