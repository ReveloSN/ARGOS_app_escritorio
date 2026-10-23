import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PreferenceStorage } from "../../services/preferences/preferenceStorage";
import { fakeEngineServices } from "../../test/engineFakes";
import { factsResult } from "../../test/factFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { CLOSED_REVIEW, REVIEW } from "../../test/reviewFixtures";

function memoryStorage(initial: Record<string, string> = {}): PreferenceStorage {
  const values = new Map(Object.entries(initial));
  return {
    read: (key) => values.get(key) ?? null,
    write: (key, value) => {
      values.set(key, value);
    },
  };
}

const SEEN = { "argus.onboarding": "done" };

function sidebarStatus() {
  const navigation = screen.getByRole("navigation", { name: "Navegación principal" });
  return within(navigation).getByRole("status");
}

async function openSettings() {
  await userEvent.click(screen.getByRole("button", { name: /Ajustes/ }));
}

describe("Asistente de IA", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
    delete document.documentElement.dataset.motion;
  });

  it("la primera vez abre los primeros pasos, avanza y lo recuerda al terminar", async () => {
    const storage = memoryStorage();
    renderApp(fakeEngineServices(), undefined, storage);
    await act(() => Promise.resolve());

    const dialog = screen.getByRole("dialog", {
      name: "1. Cargue los documentos de un expediente",
    });
    expect(dialog).toHaveTextContent("1 de 3");
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: "2. Confirme lo que se leyó" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    await userEvent.click(screen.getByRole("button", { name: /Empezar/ }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(storage.read("argus.onboarding")).toBe("done");
  });

  it("se omite con Esc y se vuelve a ver desde Ajustes", async () => {
    renderApp(fakeEngineServices(), undefined, memoryStorage());
    await act(() => Promise.resolve());

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await openSettings();
    await userEvent.click(screen.getByRole("button", { name: "Ver primeros pasos" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Primeros pasos");
  });

  it("ocultarlo quita el ojo pero conserva el estado en texto", async () => {
    const storage = memoryStorage(SEEN);
    renderApp(fakeEngineServices(), undefined, storage);
    await act(() => Promise.resolve());
    expect(sidebarStatus()).toHaveAccessibleName("Asistente de IA: Listo");
    expect(sidebarStatus().querySelector("svg")).not.toBeNull();

    await openSettings();
    await userEvent.click(screen.getByRole("switch", { name: "Mostrar asistente" }));

    expect(sidebarStatus()).toHaveTextContent("Listo");
    expect(sidebarStatus().querySelector("svg")).toBeNull();
    expect(storage.read("argus.assistant")).toBe("hidden");
  });

  it("«Reducir movimiento» se aplica a toda la app y se recuerda", async () => {
    const storage = memoryStorage(SEEN);
    renderApp(fakeEngineServices(), undefined, storage);
    await act(() => Promise.resolve());
    await openSettings();

    await userEvent.click(screen.getByRole("switch", { name: "Reducir movimiento" }));

    expect(document.documentElement.dataset.motion).toBe("reduced");
    expect(storage.read("argus.motion")).toBe("reduced");
  });

  it("pide una confirmación cuando el expediente tiene datos sin confirmar", async () => {
    const listFacts = vi.fn(() => Promise.resolve(factsResult()));
    const readable = {
      ...CLOSED_REVIEW,
      documents: CLOSED_REVIEW.documents.filter((document) => document.status === "read"),
    };
    renderApp(fakeEngineServices({ facts: { listFacts } }), readable, memoryStorage(SEEN));
    await act(() => Promise.resolve());

    expect(listFacts).toHaveBeenCalledWith("s-1");
    expect(sidebarStatus()).toHaveAccessibleName("Asistente de IA: Necesita una confirmación");
  });

  it("al confirmar el último valor pendiente deja de pedir confirmación", async () => {
    const decided = {
      ...REVIEW,
      documents: REVIEW.documents.filter((document) => document.status === "read"),
      decisions: { ...CLOSED_REVIEW.decisions },
    };
    const listFacts = () => Promise.resolve(factsResult());
    const addFact = vi.fn(() => Promise.resolve(factsResult({ pending: [] })));
    renderApp(fakeEngineServices({ facts: { listFacts, addFact } }), decided, memoryStorage(SEEN));
    await act(() => Promise.resolve());
    expect(sidebarStatus()).toHaveAccessibleName("Asistente de IA: Necesita una confirmación");

    await userEvent.click(screen.getByRole("button", { name: /^Expediente/ }));
    await userEvent.click(screen.getByRole("tab", { name: "Datos confirmados" }));
    await userEvent.click(await screen.findByRole("button", { name: "Confirmar valor" }));
    await userEvent.keyboard("{Enter}");

    expect(addFact).toHaveBeenCalled();
    expect(sidebarStatus()).toHaveAccessibleName("Asistente de IA: Listo");
  });
});
