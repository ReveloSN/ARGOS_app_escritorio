import { describe, expect, it } from "vitest";

import type { HistorySessionResult } from "../../services/engine/historyTypes";
import { toSessionItems } from "./sessionList";
import type { ReviewDigest } from "./sessionSnapshot";

function digest(overrides: Partial<ReviewDigest>): ReviewDigest {
  return {
    id: "s-1",
    name: "Revisión de prueba",
    isClosed: false,
    documentCount: 3,
    readableDocuments: [],
    alertCount: 5,
    pendingCount: 3,
    pendingByRisk: { high: 3, medium: 0, low: 0 },
    ...overrides,
  };
}

function session(overrides: Partial<HistorySessionResult>): HistorySessionResult {
  return {
    id: "s-1",
    name: "Revisión de prueba",
    createdAt: "2026-10-15T10:00:00+00:00",
    closedAt: null,
    status: "in_progress",
    documentCount: 3,
    alertCount: 5,
    decidedCount: 2,
    ...overrides,
  };
}

describe("lista de sesiones", () => {
  it("cuenta las alertas pendientes y marca la activa", () => {
    const items = toSessionItems([session({}), session({ id: "s-2" })], digest({ id: "s-2" }));

    expect(items.map((item) => [item.id, item.pendingCount, item.isActive])).toEqual([
      ["s-1", 3, false],
      ["s-2", 3, true],
    ]);
  });

  it("una sesión cerrada no tiene alertas pendientes", () => {
    const [item] = toSessionItems(
      [session({ status: "closed", closedAt: "2026-10-16" })],
      digest({ id: "s-9" }),
    );

    expect(item?.pendingCount).toBe(0);
    expect(item?.isClosed).toBe(true);
  });

  it("las cifras de la activa salen del estado de la sesión, no de la consulta", () => {
    // La consulta aún dice 3 pendientes; la sesión ya decidió una más.
    const [item] = toSessionItems([session({})], digest({ pendingCount: 2, name: "Renombrada" }));

    expect(item).toMatchObject({ pendingCount: 2, name: "Renombrada", isActive: true });
    expect(item?.createdAt).toBe("2026-10-15T10:00:00+00:00");
  });
});
