import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EngineRejectedError } from "../../services/engine/engineHttp";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";
import { decided, sendReview } from "../../test/sendFakes";

const DRAFT = new File(["borrador"], "Remision_contrato_4857.eml");

async function chooseDraft(services: ReturnType<typeof fakeEngineServices>, withCaseFile = true) {
  renderApp(services, withCaseFile ? REVIEW : undefined);
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: /^Revisar antes de enviar/ }));
  await userEvent.upload(screen.getByLabelText("Elegir borrador"), DRAFT);
}

describe("Revisar antes de enviar", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("revisa el borrador frente al expediente y marca cada problema", async () => {
    const reviewDraft = vi.fn(() => Promise.resolve(sendReview()));

    await chooseDraft(fakeEngineServices({ sending: { reviewDraft } }));

    expect(reviewDraft).toHaveBeenCalledWith({ file: DRAFT, sessionId: REVIEW.session.id });
    expect(await screen.findByText("2 problemas en el borrador")).toBeInTheDocument();
    expect(screen.getByText("informe de junio").tagName).toBe("MARK");
    const issues = within(screen.getByRole("list", { name: "Problemas" }));
    expect(issues.getByRole("button", { name: "Cambiar por el de junio" })).toBeInTheDocument();
    expect(screen.getByText(/1 de riesgo alto sin resolver/)).toBeInTheDocument();
  });

  it("aplica una corrección, la deshace con Ctrl Z y abre la copia con Ctrl Enter", async () => {
    const decide = vi.fn(() =>
      Promise.resolve({ decisions: [decided(1, "error")], canUndo: true }),
    );
    const undoDecision = vi.fn(() => Promise.resolve({ decisions: [], canUndo: false }));
    const openCorrected = vi.fn(() => Promise.resolve());
    const reviewDraft = vi.fn(() => Promise.resolve(sendReview()));
    await chooseDraft(
      fakeEngineServices({ sending: { reviewDraft, decide, undoDecision, openCorrected } }),
    );

    await userEvent.click(await screen.findByRole("button", { name: "Cambiar por el de junio" }));
    expect(decide).toHaveBeenCalledWith("r1", { alertNumber: 1, kind: "error" });
    expect(await screen.findByText("Se cambió el adjunto")).toBeInTheDocument();
    const attachments = within(screen.getByRole("list", { name: "Adjuntos" }));
    expect(attachments.getByText("Informe_gestion_junio_2026.pdf")).toBeInTheDocument();
    await userEvent.keyboard("{Control>}z{/Control}");
    expect(undoDecision).toHaveBeenCalledWith("r1");
    await userEvent.keyboard("{Control>}{Enter}{/Control}");
    expect(openCorrected).toHaveBeenCalledWith("r1");
    expect(
      await screen.findByText("Se abrió la copia del borrador en su programa de correo."),
    ).toBeInTheDocument();
  });

  it("sin expediente abierto revisa solo el correo", async () => {
    const reviewDraft = vi.fn(() => Promise.resolve(sendReview()));

    await chooseDraft(fakeEngineServices({ sending: { reviewDraft } }), false);

    expect(reviewDraft).toHaveBeenCalledWith({ file: DRAFT, sessionId: null });
  });

  it("explica en tres partes un archivo que no es un correo", async () => {
    const reviewDraft = vi.fn(() =>
      Promise.reject(new EngineRejectedError("/send-reviews", "not_a_draft_email")),
    );

    await chooseDraft(fakeEngineServices({ sending: { reviewDraft } }));

    expect(await screen.findByText("No se pudo leer el borrador.")).toBeInTheDocument();
    expect(screen.getByText("El archivo no es un correo .eml o está dañado.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elegir borrador" })).toBeInTheDocument();
  });
});
