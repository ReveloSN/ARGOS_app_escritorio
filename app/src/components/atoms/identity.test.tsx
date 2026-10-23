import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "../../test/renderWithProviders";
import { ArgusEye } from "./ArgusEye";
import { DiffMark } from "./DiffMark";
import { EYE_SHAPES, type EyeState } from "./eyeShapes";
import { ReticleMotif } from "./ReticleMotif";

const STATES = Object.keys(EYE_SHAPES) as EyeState[];

describe("ArgusEye", () => {
  it("con etiqueta es una imagen que se anuncia", () => {
    renderWithProviders(<ArgusEye state="alert" size="md" label="Asistente de IA: riesgo alto" />);

    expect(screen.getByRole("img", { name: "Asistente de IA: riesgo alto" })).toBeInTheDocument();
  });

  it("sin etiqueta es decorativo", () => {
    const { container } = renderWithProviders(<ArgusEye state="logo" />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("cada estado tiene una forma distinta, no solo otro color", () => {
    const shapes = STATES.map((state) => {
      const { container, unmount } = renderWithProviders(<ArgusEye state={state} />);
      const markup = container.innerHTML.replace(/class="[^"]*"|data-state="[^"]*"/g, "");
      unmount();
      return markup;
    });

    expect(new Set(shapes).size).toBe(STATES.length);
  });
});

describe("ReticleMotif", () => {
  it("es decorativo", () => {
    const { container } = renderWithProviders(<ReticleMotif size="lg" />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("DiffMark", () => {
  it.each([
    ["removed", "DEL"],
    ["added", "INS"],
    ["changed", "MARK"],
  ] as const)("una diferencia %s usa el elemento %s", (kind, tagName) => {
    renderWithProviders(<DiffMark kind={kind}>{"18.540.000"}</DiffMark>);

    expect(screen.getByText("18.540.000").tagName).toBe(tagName);
  });

  it("marca la diferencia elegida", () => {
    renderWithProviders(
      <DiffMark kind="changed" isSelected>
        {"no"}
      </DiffMark>,
    );

    expect(screen.getByText("no")).toHaveAttribute("data-selected", "true");
  });
});
