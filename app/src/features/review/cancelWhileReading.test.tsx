import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ReviewRequest, ReviewResult } from "../../services/engine/reviewTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";

describe("Cancelar mientras el motor lee los archivos", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) lo cancelado no se abre al terminar ni deja el avance de lectura colgado", async () => {
    let finish: (review: ReviewResult) => void = () => undefined;
    const startReview = vi.fn(
      (request: ReviewRequest) =>
        new Promise<ReviewResult>((resolve) => {
          request.onProgress?.({ kind: "document_started", position: 0, name: "contrato.txt" });
          finish = resolve;
        }),
    );
    renderApp(fakeEngineServices({ reviews: { startReview } }));
    const user = userEvent.setup();
    await user.click(
      within(screen.getByRole("main")).getByRole("button", { name: /Nueva revisión/ }),
    );
    await user.type(screen.getByLabelText("Nombre de la sesión"), "Revisión de prueba");
    await user.upload(screen.getByLabelText("Elegir archivos"), [
      new File(["Contrato No. 1234"], "contrato.txt"),
    ]);
    await user.click(screen.getByRole("button", { name: /Leer y comparar 1 archivo/ }));
    expect(screen.getByRole("banner")).toHaveTextContent("Leyendo 0 de 1 archivos");

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await act(async () => {
      finish(REVIEW);
      await Promise.resolve();
    });

    expect(
      screen.getByRole("heading", { level: 1, name: "Todavía no hay revisiones" }),
    ).toBeVisible();
    expect(screen.getByRole("banner")).not.toHaveTextContent("Leyendo");
  });
});
