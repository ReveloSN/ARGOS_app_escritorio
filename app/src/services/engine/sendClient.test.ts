import { describe, expect, it, vi } from "vitest";

import { jsonResponse, READY_STATE, sourceReturning } from "../../test/engineFakes";
import { EngineHttp, type FetchResource } from "./engineHttp";
import { SendClient } from "./sendClient";

function clientWith(fetchResource: FetchResource): SendClient {
  return new SendClient(new EngineHttp(sourceReturning(READY_STATE), fetchResource));
}

describe("SendClient", () => {
  it("envía el borrador con el expediente abierto", async () => {
    const review = { id: "r1", issues: [] };
    const fetchResource = vi.fn<FetchResource>(() => Promise.resolve(jsonResponse(review)));
    const file = new File(["borrador"], "Remision.eml");

    const result = await clientWith(fetchResource).reviewDraft({ file, sessionId: "s1" });

    const [url, init] = fetchResource.mock.calls[0] ?? [];
    const form = init?.body as FormData;
    expect(result).toEqual(review);
    expect(url).toBe("http://127.0.0.1:5000/send-reviews");
    expect(form.get("sessionId")).toBe("s1");
    expect((form.get("file") as File).name).toBe("Remision.eml");
  });

  it("decide con el número del problema y abre la copia corregida", async () => {
    const fetchResource = vi.fn<FetchResource>(() =>
      Promise.resolve(jsonResponse({ decisions: [], canUndo: true })),
    );
    const client = clientWith(fetchResource);

    await client.decide("r 1", { alertNumber: 3, kind: "error" });
    fetchResource.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await client.openCorrected("r 1");

    const [decideUrl, decideInit] = fetchResource.mock.calls[0] ?? [];
    expect(decideUrl).toBe("http://127.0.0.1:5000/send-reviews/r%201/decisions");
    expect(JSON.parse(decideInit?.body as string)).toEqual({ number: 3, kind: "error" });
    expect(fetchResource.mock.calls[1]?.[0]).toBe("http://127.0.0.1:5000/send-reviews/r%201/open");
  });
});
