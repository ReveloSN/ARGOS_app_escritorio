import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../test/renderWithProviders";
import { REVIEW } from "../../test/reviewFixtures";
import { NoInconsistencies } from "./NoInconsistencies";
import { ResultsViewProvider } from "./ResultsViewProvider";

const CLOSER = { close: vi.fn(), hasFailed: false };

function renderWith(review: typeof REVIEW) {
  renderWithProviders(
    <ResultsViewProvider sessionId={review.session.id}>
      <NoInconsistencies review={review} closer={CLOSER} />
    </ResultsViewProvider>,
  );
}

describe("Sin inconsistencias", () => {
  it("(regresión) si hubo archivos sin leer no afirma que todo coincide", () => {
    renderWith(REVIEW);

    expect(
      screen.getByText("No se encontraron inconsistencias en los archivos leídos"),
    ).toBeVisible();
    expect(screen.getByText(/1 archivo no se pudo leer y no se revisó\./)).toBeVisible();
  });

  it("si se leyeron todos, lo dice sin reservas", () => {
    const readAll = {
      ...REVIEW,
      documents: REVIEW.documents.filter((document) => document.status === "read"),
    };
    renderWith(readAll);

    expect(screen.getByText("No se encontraron inconsistencias")).toBeVisible();
    expect(screen.queryByText(/no se pudo leer/)).not.toBeInTheDocument();
  });
});
