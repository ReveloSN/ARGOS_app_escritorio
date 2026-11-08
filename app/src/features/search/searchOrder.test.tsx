import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";

interface Match {
  readonly document: string;
  readonly location: { readonly kind: "page"; readonly page: number };
  readonly excerpt: string;
  readonly highlightStart: number;
  readonly highlightEnd: number;
}

const matchFor = (word: string, page: number): Match => ({
  document: "anexo.pdf",
  location: { kind: "page", page },
  excerpt: `texto con ${word} dentro`,
  highlightStart: 10,
  highlightEnd: 10 + word.length,
});

describe("Búsqueda con respuestas fuera de orden", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) muestra la última búsqueda, no la que respondió tarde, y no se queda buscando", async () => {
    const pending = new Map<string, (matches: Match[]) => void>();
    const searchDocuments = vi.fn(
      (_session: string, query: string) =>
        new Promise<Match[]>((resolve) => {
          pending.set(query, resolve);
        }),
    );
    renderApp(fakeEngineServices({ documents: { searchDocuments } }), REVIEW);
    await act(() => Promise.resolve());
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Expediente/ }));
    await user.keyboard("{Control>}k{/Control}");
    const box = screen.getByRole("combobox");

    await user.type(box, "contrato");
    await waitFor(() => {
      expect(pending.has("contrato")).toBe(true);
    });
    await user.clear(box);
    await user.type(box, "anexo");
    await waitFor(() => {
      expect(pending.has("anexo")).toBe(true);
    });
    await act(async () => {
      pending.get("anexo")?.([matchFor("anexo", 2)]);
      await Promise.resolve();
    });
    await act(async () => {
      pending.get("contrato")?.([matchFor("contrato", 9)]);
      await Promise.resolve();
    });

    const fragments = screen.getByRole("group", { name: "Fragmentos de documentos" });
    expect(within(fragments).getByText("anexo")).toBeInTheDocument();
    expect(screen.queryByText(/Buscando/)).not.toBeInTheDocument();
  });
});
