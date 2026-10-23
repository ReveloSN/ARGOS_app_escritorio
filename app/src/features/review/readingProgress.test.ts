import { describe, expect, it } from "vitest";

import { applyProgress, finishedCount, startReading } from "./readingProgress";

const READ = {
  name: "a.pdf",
  status: "read" as const,
  reason: null,
  fragmentCount: 3,
  method: "text" as const,
  pageCount: null,
};
const UNREADABLE = {
  name: "b.pdf",
  status: "unreadable" as const,
  reason: "no_text" as const,
  fragmentCount: 0,
  method: "text" as const,
  pageCount: null,
};

describe("avance de la lectura", () => {
  it("empieza con todos los archivos en espera", () => {
    const state = startReading(["a.pdf", "b.pdf"], 0);

    expect(state.files.map((file) => file.status)).toEqual(["waiting", "waiting"]);
    expect(finishedCount(state)).toBe(0);
    expect(state.remainingSeconds).toBeUndefined();
  });

  it("marca cada archivo al empezar y al terminar, y estima lo que falta", () => {
    let state = startReading(["a.pdf", "b.pdf", "c.pdf"], 0);
    state = applyProgress(state, { kind: "document_started", position: 0, name: "a.pdf" }, 0);
    expect(state.files[0]?.status).toBe("reading");

    state = applyProgress(state, { kind: "document_finished", position: 0, document: READ }, 4000);
    state = applyProgress(
      state,
      { kind: "document_finished", position: 1, document: UNREADABLE },
      8000,
    );

    expect(state.files.map((file) => file.status)).toEqual(["read", "unreadable", "waiting"]);
    expect(finishedCount(state)).toBe(2);
    // Dos archivos en 8 s: 4 s por archivo y queda uno.
    expect(state.remainingSeconds).toBe(4);
  });

  it("al comparar ya no estima tiempo por archivo", () => {
    const state = applyProgress(startReading(["a.pdf"], 0), { kind: "analysis_started" }, 1000);

    expect(state.isComparing).toBe(true);
    expect(state.remainingSeconds).toBeUndefined();
  });

  it("con OCR anota la página que va leyendo de cada archivo", () => {
    let state = startReading(["anexo_3.pdf"], 0);
    state = applyProgress(state, { kind: "document_started", position: 0, name: "anexo_3.pdf" }, 0);

    state = applyProgress(state, { kind: "page_recognized", position: 0, done: 2, total: 4 }, 0);

    expect(state.files[0]).toEqual({
      name: "anexo_3.pdf",
      status: "reading",
      pages: { done: 2, total: 4 },
    });
  });
});
