import { describe, expect, it } from "vitest";

import { CLOSED_REVIEW, REVIEW } from "../../test/reviewFixtures";
import { comparison } from "../../test/comparisonFakes";
import { isEmptySnapshot, snapshotOf } from "./sessionSnapshot";

describe("estado de la sesión activa", () => {
  it("sin revisión ni comparación está vacío", () => {
    expect(isEmptySnapshot(snapshotOf(null, []))).toBe(true);
  });

  it("cuenta documentos y alertas pendientes por riesgo de la revisión", () => {
    const snapshot = snapshotOf(REVIEW, []);

    expect(isEmptySnapshot(snapshot)).toBe(false);
    expect(snapshot.review).toMatchObject({
      name: "Revisión de prueba",
      documentCount: 3,
      alertCount: 2,
      pendingCount: 2,
      pendingByRisk: { high: 1, medium: 1, low: 0 },
      isClosed: false,
    });
  });

  it("las alertas decididas dejan de estar pendientes", () => {
    const snapshot = snapshotOf(CLOSED_REVIEW, []);

    expect(snapshot.review).toMatchObject({
      pendingCount: 1,
      pendingByRisk: { high: 0, medium: 1, low: 0 },
      isClosed: true,
    });
  });

  it("una comparación sola ya no es una sesión vacía", () => {
    const snapshot = snapshotOf(null, [comparison({})]);

    expect(isEmptySnapshot(snapshot)).toBe(false);
    expect(snapshot.review).toBeNull();
    expect(snapshot.comparisons).toHaveLength(1);
  });
});
