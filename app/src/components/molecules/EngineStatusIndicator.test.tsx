import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { EngineStatus } from "../../services/engine/engineStatusMonitor";
import { EngineStatusIndicator } from "./EngineStatusIndicator";

describe("EngineStatusIndicator", () => {
  it.each<[EngineStatus, string]>([
    ["starting", "Iniciando motor de análisis"],
    ["ready", "Motor de análisis: listo"],
    ["stopped", "Motor de análisis detenido"],
  ])("anuncia el estado %s con texto, no solo con color", (status, text) => {
    render(<EngineStatusIndicator status={status} />);

    expect(screen.getByRole("status")).toHaveTextContent(text);
  });
});
