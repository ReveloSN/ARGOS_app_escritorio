import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";

const MATCH = {
  document: "anexo.pdf",
  location: { kind: "page" as const, page: 3 },
  excerpt: "…celebran el presente Contrato No. 1324 de arrendamiento…",
  highlightStart: 22,
  highlightEnd: 39,
};

describe("Búsqueda global (Ctrl K)", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("no aparece en Inicio, donde no hay nada que buscar", async () => {
    renderApp(fakeEngineServices());
    await act(() => Promise.resolve());

    await userEvent.keyboard("{Control>}k{/Control}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("en una revisión busca en alertas y en fragmentos de los documentos", async () => {
    const searchDocuments = vi.fn(() => Promise.resolve([MATCH]));
    const openDocument = vi.fn(() => Promise.resolve());
    renderApp(fakeEngineServices({ documents: { searchDocuments, openDocument } }), REVIEW);
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByRole("button", { name: /Revisión actual/ }));

    await userEvent.keyboard("{Control>}k{/Control}");
    await userEvent.type(screen.getByRole("combobox"), "1324");

    const alerts = await screen.findByRole("group", { name: "Alertas" });
    expect(alerts).toHaveTextContent("#1 · El número de contrato no coincide");
    const fragments = screen.getByRole("group", { name: "Fragmentos de documentos" });
    expect(within(fragments).getByText("Contrato No. 1324")).toBeInTheDocument();
    expect(searchDocuments).toHaveBeenCalledWith("s-1", "1324");

    await userEvent.click(within(fragments).getByRole("option"));
    expect(openDocument).toHaveBeenCalledWith("s-1", "anexo.pdf");
  });

  it("Enter abre la alerta elegida y Escape cierra", async () => {
    renderApp(
      fakeEngineServices({ documents: { searchDocuments: () => Promise.resolve([]) } }),
      REVIEW,
    );
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByRole("button", { name: /Revisión actual/ }));

    await userEvent.click(screen.getByRole("button", { name: /Buscar en alertas y documentos/ }));
    await userEvent.type(screen.getByRole("combobox"), "peña");
    await screen.findByRole("group", { name: "Alertas" });
    await userEvent.keyboard("{Enter}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "El nombre de una persona es distinto" }),
    ).toBeInTheDocument();

    await userEvent.keyboard("{Control>}k{/Control}");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("explica cuándo falta escribir y cuándo no hay resultados", async () => {
    renderApp(
      fakeEngineServices({ documents: { searchDocuments: () => Promise.resolve([]) } }),
      REVIEW,
    );
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByRole("button", { name: /Revisión actual/ }));
    await userEvent.keyboard("{Control>}k{/Control}");

    expect(screen.getByText("Escriba al menos 2 letras.")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("combobox"), "zzz");
    expect(await screen.findByText("Sin resultados para «zzz».")).toBeInTheDocument();
  });
});
