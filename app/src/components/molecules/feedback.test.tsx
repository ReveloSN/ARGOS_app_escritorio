import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../test/renderWithProviders";
import { AssistantStatusIndicator } from "./AssistantStatusIndicator";
import { DiffValue } from "./DiffValue";
import { EmptyState } from "./EmptyState";
import { ErrorMessage } from "./ErrorMessage";
import { SourceLine } from "./SourceLine";
import { Toast } from "./Toast";

describe("ErrorMessage", () => {
  it("tiene las 3 partes: qué pasó, por qué y qué hacer, con un botón", async () => {
    const onPrimary = vi.fn();
    renderWithProviders(
      <ErrorMessage
        tone="inline"
        what={"No pudimos leer «anexo_3.pdf»."}
        why={"Es una imagen escaneada sin texto."}
        todo={"Súbalo de nuevo con texto seleccionable."}
        primaryAction={{ label: "Reemplazar archivo", onClick: onPrimary }}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("No pudimos leer «anexo_3.pdf».");
    expect(alert).toHaveTextContent("Es una imagen escaneada sin texto.");
    await userEvent.click(screen.getByRole("button", { name: "Reemplazar archivo" }));
    expect(onPrimary).toHaveBeenCalledOnce();
  });

  it("el código técnico solo aparece traducido como detalle para soporte", () => {
    renderWithProviders(
      <ErrorMessage
        tone="neutral"
        what={"El análisis se detuvo."}
        todo={"Reinícielo para continuar desde ese punto."}
        technicalCode="ENGINE_TIMEOUT"
        primaryAction={{ label: "Reiniciar análisis", onClick: vi.fn() }}
      />,
    );

    expect(screen.getByText("Detalle técnico, para soporte: ENGINE_TIMEOUT")).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("presenta título, explicación y acción", () => {
    renderWithProviders(
      <EmptyState
        icon="folder_open"
        title={"Todavía no hay revisiones"}
        description={"Cargue los documentos que va a enviar o firmar."}
        actions={<button type="button">{"Nueva revisión"}</button>}
      />,
    );

    expect(screen.getByRole("heading", { name: "Todavía no hay revisiones" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nueva revisión" })).toBeInTheDocument();
  });
});

describe("Toast", () => {
  it("confirma la decisión y permite deshacerla", async () => {
    const onUndo = vi.fn();
    renderWithProviders(
      <Toast message={"Alerta 1 marcada como «Es un error»."} visible onUndo={onUndo} />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Deshacer/ }));

    expect(screen.getByRole("status")).toHaveTextContent("Alerta 1 marcada como «Es un error».");
    expect(onUndo).toHaveBeenCalledOnce();
  });
});

describe("DiffValue", () => {
  it("resalta y subraya solo los caracteres distintos", () => {
    const { container } = renderWithProviders(<DiffValue value="4857" positions={[2, 3]} />);

    const marks = container.querySelectorAll("mark");
    expect([...marks].map((mark) => mark.textContent)).toEqual(["8", "5"]);
    expect(container).toHaveTextContent("4857");
  });
});

describe("SourceLine", () => {
  it("muestra el archivo y la ubicación del valor", () => {
    renderWithProviders(<SourceLine fileName="Contrato_4857_v3.pdf" location={"Página 1"} />);

    expect(screen.getByText("Contrato_4857_v3.pdf")).toBeInTheDocument();
    expect(screen.getByText("Página 1")).toBeInTheDocument();
  });
});

describe("AssistantStatusIndicator", () => {
  it("anuncia el estado con texto, no solo con color", () => {
    renderWithProviders(
      <AssistantStatusIndicator status={{ text: "3 alertas de riesgo alto", isHighRisk: true }} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("3 alertas de riesgo alto");
  });

  it("con el motor detenido ofrece reintentar", async () => {
    const onClick = vi.fn();
    renderWithProviders(
      <AssistantStatusIndicator
        status={{
          text: "Asistente de IA detenido",
          isHighRisk: true,
          retry: { label: "Reintentar", onClick },
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
