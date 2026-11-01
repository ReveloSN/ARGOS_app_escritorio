import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { decided, sendReview } from "../../test/sendFakes";

const NUMBER_ISSUE = {
  number: 1,
  kind: "identifier_mismatch" as const,
  risk: "high" as const,
  part: "subject" as const,
  markedText: "4587",
  params: { mentioned: "4587", attached: "4857", document: "Contrato_4857_v3.docx" },
  fix: null,
};

describe("Revisar antes de enviar: el número de contrato no coincide con el adjunto", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) marca el número en el asunto y explica con qué archivo no coincide", async () => {
    const review = {
      ...sendReview(),
      draft: { ...sendReview().draft, subject: "Contrato No. 4587 firmado" },
      issues: [NUMBER_ISSUE],
    };
    const reviewDraft = vi.fn(() => Promise.resolve(review));
    renderApp(fakeEngineServices({ sending: { reviewDraft } }));
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByRole("button", { name: /^Revisar antes de enviar/ }));
    await userEvent.upload(screen.getByLabelText("Elegir borrador"), new File(["x"], "r.eml"));

    expect(await screen.findByText("1 problema en el borrador")).toBeVisible();
    expect(screen.getByText("4587", { selector: "mark" })).toBeVisible();
    const issues = within(screen.getByRole("list", { name: "Problemas" }));
    expect(issues.getByText("Cita el número 4587 y el adjunto dice 4857")).toBeVisible();
    expect(issues.getByText(/en Contrato_4857_v3\.docx el número es 4857/)).toBeVisible();
  });

  it("(regresión) marcarlo como error no promete corregir el correo: ARGUS no cambia su texto", async () => {
    const review = {
      ...sendReview(),
      draft: { ...sendReview().draft, subject: "Contrato No. 4587 firmado" },
      issues: [NUMBER_ISSUE],
    };
    const decide = vi.fn(() =>
      Promise.resolve({ decisions: [decided(1, "error")], canUndo: true }),
    );
    renderApp(
      fakeEngineServices({ sending: { reviewDraft: () => Promise.resolve(review), decide } }),
    );
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByRole("button", { name: /^Revisar antes de enviar/ }));
    await userEvent.upload(screen.getByLabelText("Elegir borrador"), new File(["x"], "r.eml"));

    await userEvent.click(await screen.findByRole("button", { name: "Es un error" }));

    expect(
      await screen.findByText(
        "Problema 1 marcado como error. ARGUS no cambia el texto del correo.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/se aplicará en la copia/)).not.toBeInTheDocument();
  });

  it("un monto del cuerpo que se parece al del adjunto se marca y dice cómo está escrito en cada lado", async () => {
    const base = sendReview();
    const review = {
      ...base,
      draft: { ...base.draft, body: "El canon es de $ 18.450.000 mensuales." },
      issues: [
        {
          ...NUMBER_ISSUE,
          kind: "amount_mismatch" as const,
          part: "body" as const,
          markedText: "$ 18.450.000",
          params: {
            mentioned: "$ 18.450.000",
            attached: "$ 18.540.000",
            document: "Contrato_4857_v3.docx",
          },
        },
      ],
    };
    renderApp(fakeEngineServices({ sending: { reviewDraft: () => Promise.resolve(review) } }));
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByRole("button", { name: /^Revisar antes de enviar/ }));
    await userEvent.upload(screen.getByLabelText("Elegir borrador"), new File(["x"], "r.eml"));

    expect(await screen.findByText("$ 18.450.000", { selector: "mark" })).toBeVisible();
    const issues = within(screen.getByRole("list", { name: "Problemas" }));
    expect(issues.getByText("Cita $ 18.450.000 y el adjunto dice $ 18.540.000")).toBeVisible();
  });
});
