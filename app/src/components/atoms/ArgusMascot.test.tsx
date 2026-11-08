import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "../../test/renderWithProviders";
import { ArgusMascot } from "./ArgusMascot";
import { EYE_SHAPES, type EyeState } from "./eyeShapes";

const STATES = Object.keys(EYE_SHAPES) as EyeState[];

function drawingOf(state: EyeState): string {
  const { container, unmount } = renderWithProviders(<ArgusMascot state={state} />);
  const markup = container.innerHTML.replace(/class="[^"]*"|data-[a-z]+="[^"]*"/g, "");
  unmount();
  return markup;
}

describe("ArgusMascot", () => {
  it("con etiqueta es una sola imagen que se anuncia", () => {
    renderWithProviders(<ArgusMascot state="alert" label="Asistente de IA: riesgo alto" />);

    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "Asistente de IA: riesgo alto" })).toBeInTheDocument();
  });

  it("sin etiqueta es decorativo y no expone imágenes", () => {
    const { container } = renderWithProviders(<ArgusMascot state="reading" />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("el ojo interno nunca se anuncia por su cuenta", () => {
    const { container } = renderWithProviders(<ArgusMascot state="doubt" label="Asistente" />);

    container.querySelectorAll("svg").forEach((svg) => {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("cada estado tiene una forma distinta, no solo otro color", () => {
    expect(new Set(STATES.map(drawingOf)).size).toBe(STATES.length);
  });

  it("solo el éxito celebra: brazos arriba y sonrisa", () => {
    const poses = STATES.map((state) => {
      const { container, unmount } = renderWithProviders(<ArgusMascot state={state} />);
      const pose = container.firstElementChild?.getAttribute("data-pose");
      unmount();
      return [state, pose] as const;
    });

    expect(poses.filter(([, pose]) => pose === "celebrate")).toEqual([["success", "celebrate"]]);
  });
});
