import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { HistoryResult } from "../../services/engine/historyTypes";
import type { ReviewResult } from "../../services/engine/reviewTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";
import { SECOND_REVIEW, TWO_SESSIONS } from "../../test/sessionFixtures";

const THIRD_REVIEW: ReviewResult = {
  ...SECOND_REVIEW,
  session: { ...SECOND_REVIEW.session, id: "s-3", name: "Póliza 2027" },
};

const THREE_SESSIONS: HistoryResult = {
  ...TWO_SESSIONS,
  sessions: [
    {
      id: "s-3",
      name: "Póliza 2027",
      createdAt: "2026-10-25T10:00:00+00:00",
      closedAt: null,
      status: "in_progress",
      documentCount: 1,
      alertCount: 1,
      decidedCount: 0,
    },
    ...TWO_SESSIONS.sessions,
  ],
};

/** Cada apertura queda pendiente hasta que la prueba decide en qué orden responde el motor. */
function deferredOpenings() {
  const pending = new Map<string, (review: ReviewResult) => void>();
  const openReview = vi.fn(
    (id: string) =>
      new Promise<ReviewResult>((resolve) => {
        pending.set(id, resolve);
      }),
  );
  const answer = async (id: string, review: ReviewResult) => {
    await act(async () => {
      pending.get(id)?.(review);
      await Promise.resolve();
    });
  };
  return { openReview, answer };
}

async function choose(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole("button", { name: /Cambiar de sesión/ }));
  const menu = await screen.findByRole("menu", { name: "Sesiones" });
  await user.click(await within(menu).findByRole("menuitemradio", { name }));
}

describe("Selector de sesión con aperturas solapadas", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) queda activa la última sesión pedida aunque el motor responda en otro orden", async () => {
    const { openReview, answer } = deferredOpenings();
    const services = fakeEngineServices({
      history: { history: vi.fn(() => Promise.resolve(THREE_SESSIONS)) },
      reviews: { openReview },
    });
    renderApp(services, REVIEW);
    const user = userEvent.setup();

    await choose(user, /Anexo de seguros/);
    await choose(user, /Póliza 2027/);
    expect(openReview.mock.calls.map(([id]) => id)).toEqual(["s-2", "s-3"]);
    await answer("s-3", THIRD_REVIEW);
    await answer("s-2", SECOND_REVIEW);

    expect(screen.getByRole("button", { name: /Sesión activa: Póliza 2027/ })).toBeVisible();
  });
});
