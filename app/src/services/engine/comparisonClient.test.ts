import { describe, expect, it, vi } from "vitest";

import { jsonResponse, READY_STATE, sourceReturning } from "../../test/engineFakes";
import { ComparisonClient } from "./comparisonClient";
import type { ComparisonProgressEvent } from "./comparisonTypes";
import { EngineHttp, type FetchResource } from "./engineHttp";

const COMPARISON = { id: "c1", pairs: [], inconsistencies: [] };

function eventStream(...events: readonly [string, unknown][]): Response {
  const text = events.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
  return new Response(text.join(""), { headers: { "Content-Type": "text/event-stream" } });
}

function clientWith(fetchResource: FetchResource): ComparisonClient {
  return new ComparisonClient(new EngineHttp(sourceReturning(READY_STATE), fetchResource));
}

describe("ComparisonClient", () => {
  it("envía el modo con los archivos y avisa cada par comparado", async () => {
    const fetchResource = vi.fn<FetchResource>(() =>
      Promise.resolve(
        eventStream(["pair_compared", { position: 0, total: 1 }], ["comparison", COMPARISON]),
      ),
    );
    const progress: ComparisonProgressEvent[] = [];

    const comparison = await clientWith(fetchResource).startComparison({
      name: "Arrendamiento",
      mode: "versions",
      files: [new File(["v1"], "v1.txt"), new File(["v2"], "v2.txt")],
      onProgress: (event) => progress.push(event),
    });

    const [url, init] = fetchResource.mock.calls[0] ?? [];
    const form = init?.body as FormData;
    expect(comparison).toEqual(COMPARISON);
    expect(url).toBe("http://127.0.0.1:5000/comparisons");
    expect(form.get("mode")).toBe("versions");
    expect(form.getAll("files")).toHaveLength(2);
    expect(progress).toEqual([{ kind: "pair_compared", position: 0, total: 1 }]);
  });

  it("decide con el número del elemento de la comparación", async () => {
    const decisions = { decisions: [], canUndo: true };
    const fetchResource = vi.fn<FetchResource>(() => Promise.resolve(jsonResponse(decisions)));

    await clientWith(fetchResource).decide("c 1", { alertNumber: 3, kind: "error" });

    const [url, init] = fetchResource.mock.calls[0] ?? [];
    expect(url).toBe("http://127.0.0.1:5000/comparisons/c%201/decisions");
    expect(JSON.parse(init?.body as string)).toEqual({ number: 3, kind: "error" });
  });
});
