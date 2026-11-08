import { describe, expect, it, vi } from "vitest";

import { READY_STATE, sourceReturning } from "../../test/engineFakes";
import { EngineHttp, EngineUnavailableError } from "./engineHttp";

const REQUEST = { path: "/health", timeoutMs: 1000 };

// Un cuerpo ilegible es «el motor no respondió bien», no un SyntaxError sin traducir (§9).
describe("respuestas del motor con cuerpo ilegible", () => {
  it("(regresión) un 200 que no es JSON se informa como motor no disponible", async () => {
    const http = new EngineHttp(sourceReturning(READY_STATE), () =>
      Promise.resolve(new Response("<html>proxy</html>", { status: 200 })),
    );

    await expect(http.json(REQUEST)).rejects.toBeInstanceOf(EngineUnavailableError);
  });

  it("(regresión) un flujo que se corta a mitad se informa como motor no disponible", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("event: review\ndata: {"));
        controller.error(new TypeError("network error"));
      },
    });
    const http = new EngineHttp(sourceReturning(READY_STATE), () =>
      Promise.resolve(new Response(body, { status: 200 })),
    );

    await expect(http.stream(REQUEST, vi.fn())).rejects.toBeInstanceOf(EngineUnavailableError);
  });
});
