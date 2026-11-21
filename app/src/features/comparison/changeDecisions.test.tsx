import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onlyRows } from "../../test/changeRows";
import {
  ALL_DECIDED,
  DECIDED_FIRST,
  openChanges,
  selectedChangeDetail,
} from "../../test/changeListHarness";
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

    const group = within(selectedChangeDetail().getByRole("group", { name: /./ }));
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
    await userEvent.click(selectedChangeDetail().getByRole("button", { name: /Es correcto/ }));

    expect(await screen.findByText("1 de 4 decididos")).toBeVisible();
  });

  it("(regresión) la confirmación ocupa la franja reservada: la lista y el cambio elegido no se mueven", async () => {
    const list = await openChanges();
    await userEvent.click(required(onlyRows(list.getAllByRole("button"))[0]));
    const hint = screen.getByText(
      (_content, element) =>
        element?.tagName === "P" && (element.textContent ?? "").includes("decidir"),
    );
    const slot = hint.parentElement;
    expect(hint).toBeVisible();
    expect(hint).toHaveTextContent("J K moverse · C E I decidir · Ctrl Z deshacer");

    await userEvent.click(selectedChangeDetail().getByRole("button", { name: /Es correcto/ }));

    // La copia oculta que reserva el alto no cuenta: solo la confirmación visible.
    const matches = await screen.findAllByText(/marcado como «Es correcto»/);
    const visible = matches.filter((element) => !element.closest("[aria-hidden='true']"));
    expect(visible).toHaveLength(1);
    const status = visible[0]?.closest("[role='status']");
    // Misma franja que los atajos (que se ocultan), arriba del panel y antes de la lista.
    expect(slot).toContainElement(status as HTMLElement);
    // El alto de la franja lo fija una copia oculta de la confirmación más larga posible.
    const sizer = slot?.querySelector("[data-slot-sizer]");
    expect(sizer).toHaveAttribute("aria-hidden", "true");
    expect(sizer).toHaveTextContent(/marcado como «.+»/);
    expect(status).toHaveTextContent("Deshacer");
    expect(hint).toHaveAttribute("aria-hidden", "true");
    const changes = screen.getByRole("heading", { name: "Cambios" });
    expect(slot?.compareDocumentPosition(changes)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    // La confirmación no se lleva el foco.
    expect(status).not.toContainElement(document.activeElement as HTMLElement);
  });

  it("(regresión) con todos decididos la cabecera dice que la revisión está completa", async () => {
    const list = await openChanges(ALL_DECIDED as typeof DECIDED_FIRST);

    await userEvent.click(required(onlyRows(list.getAllByRole("button"))[0]));
    await userEvent.click(selectedChangeDetail().getByRole("button", { name: /Es correcto/ }));

    expect(
      await screen.findByText("Revisión completa. 4 correctos. Ya puede exportar el informe."),
    ).toBeVisible();
  });

  it("(regresión) «Se guardó» va debajo de los botones: al decidir, los botones no se mueven", async () => {
    const list = await openChanges();
    const firstRow = () => required(onlyRows(list.getAllByRole("button"))[0]);
    await userEvent.click(firstRow());
    await userEvent.click(selectedChangeDetail().getByRole("button", { name: /Es correcto/ }));
    await userEvent.click(firstRow());

    const saved = await screen.findByText(/Se guardó: Es correcto/);
    const group = selectedChangeDetail().getByRole("group", { name: "Sobre este cambio" });
    expect(group.compareDocumentPosition(saved) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
