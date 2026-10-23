import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../test/renderWithProviders";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Kbd } from "./Kbd";

describe("Icon", () => {
  it("es decorativo: los lectores de pantalla lo ignoran", () => {
    const { container } = renderWithProviders(<Icon name="report" />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.firstElementChild).toHaveTextContent("report");
  });
});

describe("Button", () => {
  it("ejecuta su acción al pulsarlo", async () => {
    const onClick = vi.fn();
    renderWithProviders(<Button onClick={onClick}>{"Revisar"}</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Revisar" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("no envía formularios por accidente", () => {
    renderWithProviders(<Button>{"Atrás"}</Button>);

    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("desactivado no responde", async () => {
    const onClick = vi.fn();
    renderWithProviders(
      <Button disabled onClick={onClick}>
        {"Revisar"}
      </Button>,
    );

    await userEvent.click(screen.getByRole("button"));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("muestra su atajo de teclado visible", () => {
    renderWithProviders(<Button shortcut={["mod", "N"]}>{"Nueva revisión"}</Button>);

    expect(screen.getByRole("button")).toHaveTextContent("Nueva revisiónCtrl N");
  });

  it("aplica la variante elegida", () => {
    renderWithProviders(<Button variant="tertiary">{"Cancelar"}</Button>);

    expect(screen.getByRole("button").className).toMatch(/tertiary/);
  });
});

describe("Kbd", () => {
  it("traduce el modificador según el sistema operativo", () => {
    renderWithProviders(<Kbd keys={["mod", "K"]} />);

    expect(screen.getByText("Ctrl K")).toBeInTheDocument();
  });

  it("muestra el símbolo de comando en macOS", () => {
    const userAgent = vi.spyOn(navigator, "userAgent", "get");
    userAgent.mockReturnValue("Macintosh; Intel Mac OS X");
    renderWithProviders(<Kbd keys={["mod", "Z"]} />);

    expect(screen.getByText("⌘ Z")).toBeInTheDocument();
    userAgent.mockRestore();
  });
});
