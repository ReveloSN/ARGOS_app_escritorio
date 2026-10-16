import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../test/renderWithProviders";
import { CompactAlertList } from "./CompactAlertList";
import { DecisionCard } from "./DecisionCard";
import { DecisionPanel } from "./DecisionPanel";

const VALUES = { first: "4857", second: "4587" };

describe("DecisionPanel", () => {
  it("muestra las tres decisiones con su atajo y avisa la elegida", async () => {
    const onDecide = vi.fn();
    renderWithProviders(
      <DecisionPanel
        current={undefined}
        correctSide={undefined}
        values={VALUES}
        correctionHint="Opcional."
        onDecide={onDecide}
        onChooseCorrect={vi.fn()}
      />,
    );

    const panel = screen.getByRole("region", { name: "¿Cómo quiere continuar?" });
    expect(within(panel).getByRole("button", { name: /Es correcto.*C/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await userEvent.click(within(panel).getByRole("button", { name: /Ignorar/ }));
    expect(onDecide).toHaveBeenCalledWith("ignored");
    expect(
      screen.queryByRole("group", { name: "¿Cuál es el valor correcto?" }),
    ).not.toBeInTheDocument();
  });

  it("con «Es un error» pregunta cuál valor es el correcto", async () => {
    const onChooseCorrect = vi.fn();
    renderWithProviders(
      <DecisionPanel
        current="error"
        correctSide="second"
        values={VALUES}
        correctionHint="Se agregará a correcciones."
        onDecide={vi.fn()}
        onChooseCorrect={onChooseCorrect}
      />,
    );

    const chooser = screen.getByRole("group", { name: "¿Cuál es el valor correcto?" });
    expect(within(chooser).getByRole("button", { name: /4587 Valor B/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(within(chooser).getByRole("button", { name: /4857 Valor A/ }));
    expect(onChooseCorrect).toHaveBeenCalledWith("first");
    expect(chooser).toHaveTextContent("Se agregará a correcciones.");
  });
});

describe("CompactAlertList", () => {
  it("marca la alerta actual y abre otra al elegirla", async () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <CompactAlertList
        summary="2 alertas · ordenadas por riesgo"
        currentNumber={1}
        onSelect={onSelect}
        items={[
          {
            number: 1,
            risk: "high",
            title: "Contrato",
            values: "4857 · 4587",
            state: "Pendiente",
            isPending: true,
          },
          {
            number: 2,
            risk: "medium",
            title: "Nombre",
            values: "Pérez · Peña",
            state: "Es correcto",
            isPending: false,
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: /Contrato/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: /Nombre/ }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});

describe("DecisionCard", () => {
  it("muestra los dos valores, la decisión y la nota", () => {
    renderWithProviders(
      <DecisionCard
        data={{
          number: 1,
          risk: "high",
          typeLabel: "Monto",
          title: "El monto no coincide",
          valueA: "$ 18.450.000",
          valueB: "$ 18.540.000",
          decision: "error",
          decidedAt: "15/10/2026 10:10",
          note: "Valor correcto: $ 18.450.000",
        }}
      />,
    );

    const card = screen.getByRole("article");
    expect(card).toHaveTextContent("$ 18.540.000");
    expect(card).toHaveTextContent("Es un error");
    expect(card).toHaveTextContent("Valor correcto: $ 18.450.000");
  });
});
