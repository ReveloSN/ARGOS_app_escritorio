import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "../../test/renderWithProviders";
import { DecisionTag, type DecisionState } from "./DecisionTag";
import { FileTypeBadge } from "./FileTypeBadge";
import { RiskTag, type RiskLevel } from "./RiskTag";

describe("RiskTag", () => {
  it.each<[RiskLevel, string, string]>([
    ["high", "report", "Alto"],
    ["medium", "warning", "Medio"],
    ["low", "info", "Bajo"],
  ])("el riesgo %s se comunica con icono y texto, no solo con color", (level, icon, text) => {
    const { container } = renderWithProviders(<RiskTag level={level} />);

    expect(container).toHaveTextContent(`${icon}${text}`);
  });

  it("la versión larga nombra el riesgo completo", () => {
    renderWithProviders(<RiskTag level="high" variant="long" />);

    expect(screen.getByText("Riesgo alto")).toBeInTheDocument();
  });

  it("se traduce al inglés", () => {
    renderWithProviders(<RiskTag level="medium" variant="long" />, "en");

    expect(screen.getByText("Medium risk")).toBeInTheDocument();
  });
});

describe("DecisionTag", () => {
  it.each<[DecisionState, string]>([
    ["pending", "Pendiente"],
    ["correct", "Es correcto"],
    ["error", "Es un error"],
    ["ignored", "Ignorada"],
  ])("el estado %s muestra su nombre", (state, text) => {
    renderWithProviders(<DecisionTag state={state} />);

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("«Ignorada» se distingue de «Es un error» por su forma, no solo por color", () => {
    const { container: ignored } = renderWithProviders(<DecisionTag state="ignored" />);
    const { container: error } = renderWithProviders(<DecisionTag state="error" />);

    expect(ignored.firstElementChild?.className).not.toBe(error.firstElementChild?.className);
    expect(ignored).toHaveTextContent("visibility_off");
    expect(error).toHaveTextContent("edit_note");
  });
});

describe("FileTypeBadge", () => {
  it("muestra el formato del archivo", () => {
    renderWithProviders(<FileTypeBadge format="XLSX" />);

    expect(screen.getByText("XLSX")).toBeInTheDocument();
  });
});
