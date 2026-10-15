import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell } from "./AppShell";
import { ListDetailLayout } from "./ListDetailLayout";
import { WizardLayout } from "./WizardLayout";

describe("templates", () => {
  it("AppShell ubica barra lateral, barra superior y contenido principal", () => {
    render(
      <AppShell sidebar={<nav>{"lateral"}</nav>} topbar={<header>{"superior"}</header>}>
        {"contenido"}
      </AppShell>,
    );

    expect(screen.getByRole("main")).toHaveTextContent("contenido");
    expect(screen.getByRole("navigation")).toHaveTextContent("lateral");
  });

  it("ListDetailLayout muestra encabezado, lista y detalle", () => {
    render(<ListDetailLayout header={"ruta"} list={"lista"} detail={"detalle"} />);

    expect(document.body).toHaveTextContent("rutalistadetalle");
  });

  it("WizardLayout muestra pasos, contenido, opciones y acciones", () => {
    render(
      <WizardLayout header={"pasos"} content={"carga"} aside={"opciones"} footer={"acciones"} />,
    );

    expect(screen.getByRole("contentinfo")).toHaveTextContent("acciones");
    expect(screen.getByRole("complementary")).toHaveTextContent("opciones");
  });
});
