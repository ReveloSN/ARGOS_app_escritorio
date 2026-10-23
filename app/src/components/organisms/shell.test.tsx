import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../test/renderWithProviders";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const SESSION = {
  name: "Expediente 2026-118 · Arrendamiento Bodega Fontibón",
  summary: "7 alertas pendientes de 9",
};
const ASSISTANT = {
  eye: "alert" as const,
  text: "3 alertas de riesgo alto",
  isHighRisk: true,
  isEyeShown: true,
};

function renderSidebar(collapsed = false) {
  const handlers = { onNavigate: vi.fn(), onToggleCollapsed: vi.fn(), onNewReview: vi.fn() };
  renderWithProviders(
    <Sidebar
      active="review"
      collapsed={collapsed}
      session={SESSION}
      reviewBadge="7"
      assistant={ASSISTANT}
      {...handlers}
    />,
  );
  return handlers;
}

describe("Sidebar", () => {
  it("lista las secciones globales y marca la actual", () => {
    renderSidebar();

    const navigation = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(navigation).toHaveTextContent("Inicio");
    expect(screen.getByRole("button", { name: /^Expediente/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("navega a la sección elegida", async () => {
    const { onNavigate } = renderSidebar();

    await userEvent.click(screen.getByRole("button", { name: "Historial" }));

    expect(onNavigate).toHaveBeenCalledWith("history");
  });

  it("muestra la sesión activa y el atajo para una revisión nueva", async () => {
    const { onNewReview } = renderSidebar();

    await userEvent.click(screen.getByRole("button", { name: /Nueva revisión/ }));

    expect(screen.getByText(SESSION.name)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nueva revisión/ })).toHaveTextContent("Ctrl N");
    expect(onNewReview).toHaveBeenCalledOnce();
  });

  it("se contrae y se expande, y contraída conserva los nombres accesibles", async () => {
    const { onToggleCollapsed } = renderSidebar(true);

    await userEvent.click(screen.getByRole("button", { name: "Expandir" }));

    expect(onToggleCollapsed).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Ajustes" })).toBeInTheDocument();
    expect(screen.queryByText(SESSION.name)).not.toBeInTheDocument();
  });
});

describe("Estado del asistente en la barra lateral", () => {
  it("anuncia el estado con texto y lo conserva aunque el ojo esté oculto", () => {
    renderWithProviders(
      <Sidebar
        active="home"
        collapsed={false}
        assistant={{ ...ASSISTANT, isEyeShown: false }}
        onNavigate={vi.fn()}
        onToggleCollapsed={vi.fn()}
        onNewReview={vi.fn()}
      />,
    );

    const status = screen.getByRole("status", {
      name: "Asistente de IA: 3 alertas de riesgo alto",
    });
    expect(status).toHaveTextContent("3 alertas de riesgo alto");
    expect(status.querySelector("svg")).toBeNull();
  });

  it("contraída deja solo el ojo, con la etiqueta accesible", () => {
    renderSidebar(true);

    const status = screen.getByRole("status", {
      name: "Asistente de IA: 3 alertas de riesgo alto",
    });
    expect(status.querySelector("svg")).not.toBeNull();
  });
});

describe("Topbar", () => {
  it("muestra la sesión, la búsqueda con su atajo y el estado del motor", async () => {
    const onOpenSearch = vi.fn();
    renderWithProviders(
      <Topbar
        sessionName={SESSION.name}
        assistantStatus={{
          text: "Leyendo 3 de 5 archivos",
          isHighRisk: false,
          progress: { done: 3, total: 5 },
        }}
        onOpenSearch={onOpenSearch}
        onOpenHelp={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Buscar en alertas y documentos/ }));

    expect(screen.getByRole("banner")).toHaveTextContent(SESSION.name);
    expect(screen.getByRole("status")).toHaveTextContent("Leyendo 3 de 5 archivos");
    expect(onOpenSearch).toHaveBeenCalledOnce();
  });

  it("ofrece la ayuda de atajos", async () => {
    const onOpenHelp = vi.fn();
    renderWithProviders(
      <Topbar
        assistantStatus={{ text: "Asistente de IA: listo", isHighRisk: false }}
        onOpenSearch={vi.fn()}
        onOpenHelp={onOpenHelp}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Ayuda y atajos" }));

    expect(onOpenHelp).toHaveBeenCalledOnce();
  });
});
