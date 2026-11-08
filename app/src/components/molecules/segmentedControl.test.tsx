import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "../../test/renderWithProviders";
import { SegmentedControl, type SegmentOption } from "./SegmentedControl";

const SENSITIVITY: readonly SegmentOption[] = [
  { value: "strict", label: "Estricta" },
  { value: "balanced", label: "Equilibrada" },
  { value: "lenient", label: "Permisiva" },
];

function ControlledSensitivity({ initial }: { readonly initial: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <button type="button">Antes</button>
      <SegmentedControl
        label="Sensibilidad"
        options={SENSITIVITY}
        value={value}
        onChange={setValue}
      />
    </>
  );
}

function radio(name: string): HTMLElement {
  return screen.getByRole("radio", { name });
}

describe("SegmentedControl con teclado", () => {
  it("Tab entra solo por la opción elegida y las flechas eligen, mueven el foco y dan la vuelta", async () => {
    renderWithProviders(<ControlledSensitivity initial="balanced" />);

    await userEvent.click(screen.getByRole("button", { name: "Antes" }));
    await userEvent.tab();
    expect(radio("Equilibrada")).toHaveFocus();

    await userEvent.keyboard("{ArrowRight}");
    expect(radio("Permisiva")).toHaveFocus();
    expect(radio("Permisiva")).toHaveAttribute("aria-checked", "true");

    await userEvent.keyboard("{ArrowRight}");
    expect(radio("Estricta")).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    expect(radio("Permisiva")).toHaveAttribute("aria-checked", "true");

    await userEvent.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Antes" })).toHaveFocus();
  });

  it("Inicio y Fin llevan a la primera y a la última opción", async () => {
    renderWithProviders(<ControlledSensitivity initial="balanced" />);
    radio("Equilibrada").focus();

    await userEvent.keyboard("{End}");
    expect(radio("Permisiva")).toHaveFocus();
    expect(radio("Permisiva")).toHaveAttribute("aria-checked", "true");

    await userEvent.keyboard("{Home}");
    expect(radio("Estricta")).toHaveFocus();
    expect(radio("Estricta")).toHaveAttribute("aria-checked", "true");
  });

  it("sin opción elegida el grupo sigue alcanzable con Tab y la flecha entra por la primera", async () => {
    renderWithProviders(<ControlledSensitivity initial="unknown" />);

    await userEvent.click(screen.getByRole("button", { name: "Antes" }));
    await userEvent.tab();
    expect(radio("Estricta")).toHaveFocus();
    expect(screen.queryByRole("radio", { checked: true })).toBeNull();

    await userEvent.keyboard("{ArrowRight}");
    expect(radio("Estricta")).toHaveAttribute("aria-checked", "true");
  });
});
