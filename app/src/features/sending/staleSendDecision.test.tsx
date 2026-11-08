import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DecisionsResult } from "../../services/engine/reviewTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";
import { decided, sendReview } from "../../test/sendFakes";

const FIRST_DRAFT = new File(["borrador"], "Remision_contrato_4857.eml");
const SECOND_DRAFT = new File(["otro"], "Remision_anexo.eml");

describe("Cambiar de borrador con una decisión pendiente", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) la decisión del primer borrador no se aplica al segundo", async () => {
    let answer: (result: DecisionsResult) => void = () => undefined;
    const decide = vi.fn(
      () =>
        new Promise<DecisionsResult>((resolve) => {
          answer = resolve;
        }),
    );
    const reviewDraft = vi
      .fn()
      .mockResolvedValueOnce(sendReview())
      .mockResolvedValueOnce({ ...sendReview(), id: "r2" });
    renderApp(fakeEngineServices({ sending: { reviewDraft, decide } }), REVIEW);
    await act(() => Promise.resolve());
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Revisar antes de enviar/ }));
    await user.upload(screen.getByLabelText("Elegir borrador"), FIRST_DRAFT);
    await user.click(await screen.findByRole("button", { name: "Cambiar por el de junio" }));

    await user.click(screen.getByRole("button", { name: "Cambiar borrador" }));
    await user.upload(screen.getByLabelText("Elegir borrador"), SECOND_DRAFT);
    await waitFor(() => {
      expect(reviewDraft).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText("2 problemas en el borrador")).toBeInTheDocument();
    await act(async () => {
      answer({ decisions: [decided(1, "error")], canUndo: true });
      await Promise.resolve();
    });

    expect(screen.getByText("2 problemas en el borrador")).toBeInTheDocument();
    expect(screen.queryByText("Se cambió el adjunto")).not.toBeInTheDocument();
  });
});
