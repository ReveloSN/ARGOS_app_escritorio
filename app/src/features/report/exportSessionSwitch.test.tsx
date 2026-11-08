import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ReportLocation } from "../../services/engine/reportTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { CLOSED_REVIEW } from "../../test/reviewFixtures";
import { SECOND_REVIEW, TWO_SESSIONS } from "../../test/sessionFixtures";

const PLAN = {
  folder: "Documentos/ARGUS/Revisión_de_prueba",
  fileName: "Informe_Revisión_de_prueba_231026",
  version: "0.1.0",
};
const SAVED: ReportLocation = { folder: PLAN.folder, fileName: `${PLAN.fileName}.pdf` };

describe("Exportar el informe y cambiar de sesión antes de que termine", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) la confirmación de A no aparece en B ni abre el archivo con la sesión de B", async () => {
    let finish: (location: ReportLocation) => void = () => undefined;
    const exportReport = vi.fn(
      () =>
        new Promise<ReportLocation>((resolve) => {
          finish = resolve;
        }),
    );
    renderApp(
      fakeEngineServices({
        history: { history: vi.fn(() => Promise.resolve(TWO_SESSIONS)) },
        reviews: { openReview: vi.fn(() => Promise.resolve(SECOND_REVIEW)) },
        reports: { planReport: () => Promise.resolve(PLAN), exportReport },
      }),
      CLOSED_REVIEW,
    );
    await act(() => Promise.resolve());
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Expediente/ }));
    await user.click(screen.getByRole("button", { name: "Generar informe" }));
    await screen.findByText(PLAN.folder);
    await user.keyboard("{Control>}e{/Control}");
    expect(exportReport).toHaveBeenCalledWith("s-1", "pdf", expect.anything());

    await user.click(screen.getByRole("button", { name: /Cambiar de sesión/ }));
    const menu = await screen.findByRole("menu", { name: "Sesiones" });
    await user.click(await within(menu).findByRole("menuitemradio", { name: /Anexo de seguros/ }));
    await screen.findByRole("button", { name: /Sesión activa: Anexo de seguros/ });
    await act(async () => {
      finish(SAVED);
      await Promise.resolve();
    });

    expect(
      screen.queryByText(`Se guardó ${SAVED.fileName} en ${PLAN.folder}.`),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Abrir informe" })).not.toBeInTheDocument();
  });
});
