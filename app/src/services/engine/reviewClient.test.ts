import { describe, expect, it, vi } from "vitest";

import { jsonResponse, READY_STATE, sourceReturning } from "../../test/engineFakes";
import { EngineHttp, EngineUnavailableError, type FetchResource } from "./engineHttp";
import { ReviewClient } from "./reviewClient";
import type { ReviewProgressEvent } from "./reviewTypes";

const REVIEW = {
  session: { id: "s1", name: "Revisión", createdAt: "", closedAt: null },
  documents: [],
  alerts: [],
  decisions: { decisions: [], canUndo: false },
};

function event(name: string, data: unknown): string {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** Un flujo SSE que llega en trozos cortados en cualquier parte, como en la red. */
function streamResponse(text: string, chunkSize = 7): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let start = 0; start < text.length; start += chunkSize) {
        controller.enqueue(encoder.encode(text.slice(start, start + chunkSize)));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
}

function clientWith(fetchResource: FetchResource): ReviewClient {
  return new ReviewClient(new EngineHttp(sourceReturning(READY_STATE), fetchResource));
}

describe("ReviewClient", () => {
  it("envía el nombre y los archivos y avisa el avance de cada archivo", async () => {
    const body =
      event("document_started", { position: 0, name: "notas.txt" }) +
      event("document_finished", {
        position: 0,
        document: { name: "notas.txt", status: "read", reason: null, fragmentCount: 1 },
      }) +
      event("analysis_started", {}) +
      event("review", REVIEW);
    const fetchResource = vi.fn<FetchResource>(() => Promise.resolve(streamResponse(body)));
    const progress: ReviewProgressEvent[] = [];

    const review = await clientWith(fetchResource).startReview({
      name: "Revisión",
      files: [new File(["Contrato No. 4857"], "notas.txt")],
      onProgress: (item) => progress.push(item),
    });

    const [url, init] = fetchResource.mock.calls[0] ?? [];
    const form = init?.body as FormData;
    expect(review).toEqual(REVIEW);
    expect(url).toBe("http://127.0.0.1:5000/reviews");
    expect(form.get("name")).toBe("Revisión");
    expect((form.get("files") as File).name).toBe("notas.txt");
    expect(progress.map((item) => item.kind)).toEqual([
      "document_started",
      "document_finished",
      "analysis_started",
    ]);
    expect(progress[0]).toEqual({ kind: "document_started", position: 0, name: "notas.txt" });
  });

  it("informa que el análisis se detuvo si el flujo termina sin la revisión", async () => {
    const body = event("document_started", { position: 0, name: "notas.txt" });
    const fetchResource = vi.fn(() => Promise.resolve(streamResponse(body)));

    await expect(
      clientWith(fetchResource).startReview({ name: "Revisión", files: [] }),
    ).rejects.toBeInstanceOf(EngineUnavailableError);
  });

  it("decide sobre una alerta de la sesión", async () => {
    const result = { decisions: [], canUndo: true };
    const fetchResource = vi.fn<FetchResource>(() => Promise.resolve(jsonResponse(result)));

    const decisions = await clientWith(fetchResource).decide("s 1", {
      alertNumber: 2,
      kind: "error",
    });

    const [url, init] = fetchResource.mock.calls[0] ?? [];
    expect(decisions).toEqual(result);
    expect(url).toBe("http://127.0.0.1:5000/reviews/s%201/decisions");
    expect(init?.body).toBe('{"alertNumber":2,"kind":"error"}');
  });
});
