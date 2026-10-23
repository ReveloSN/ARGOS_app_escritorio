import { describe, expect, it } from "vitest";

import { CLOSED_REVIEW, NAME_ALERT, REVIEW } from "../../test/reviewFixtures";
import { assistantStatus, type AssistantSignals } from "./assistantStatus";

const READABLE = REVIEW.documents.filter((document) => document.status === "read");
const IDLE: AssistantSignals = {
  engine: "ready",
  reading: null,
  isExplaining: false,
  review: null,
  unconfirmed: 0,
};

function statusWith(signals: Partial<AssistantSignals>) {
  return assistantStatus({ ...IDLE, ...signals });
}

describe("assistantStatus", () => {
  it("sin expediente y con el motor listo está atento", () => {
    expect(statusWith({})).toMatchObject({ condition: "ready", eye: "reading" });
  });

  it("con el motor detenido o iniciando queda en pausa, aunque haya expediente", () => {
    expect(statusWith({ engine: "stopped", review: REVIEW })).toMatchObject({
      condition: "paused",
      eye: "idle",
    });
    expect(statusWith({ engine: "starting" }).condition).toBe("starting");
  });

  it("mientras lee dice cuántos archivos lleva", () => {
    expect(statusWith({ reading: { done: 2, total: 5 }, review: REVIEW })).toMatchObject({
      condition: "reading",
      count: 2,
      total: 5,
    });
  });

  it("mientras explica un cambio mira hacia la explicación", () => {
    expect(statusWith({ isExplaining: true, review: REVIEW }).eye).toBe("explaining");
  });

  it("un archivo ilegible pesa más que las alertas", () => {
    expect(statusWith({ review: REVIEW })).toMatchObject({ condition: "unreadable", count: 1 });
  });

  it("cuenta solo las alertas de riesgo alto que siguen pendientes", () => {
    const readable = { ...REVIEW, documents: READABLE };
    expect(statusWith({ review: readable })).toMatchObject({ condition: "highRisk", count: 1 });

    const decided = { ...CLOSED_REVIEW, documents: READABLE };
    expect(statusWith({ review: decided, unconfirmed: 2 })).toMatchObject({
      condition: "needsConfirmation",
      eye: "doubt",
    });
  });

  it("sin alertas ni dudas, parpadea de éxito; con alertas medias, sigue atento", () => {
    const empty = { ...REVIEW, documents: READABLE, alerts: [] };
    expect(statusWith({ review: empty })).toMatchObject({ condition: "clear", eye: "success" });

    const medium = { ...REVIEW, documents: READABLE, alerts: [NAME_ALERT] };
    expect(statusWith({ review: medium }).condition).toBe("ready");
  });
});
