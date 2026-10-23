import { describe, expect, it, vi } from "vitest";

import { jsonResponse, READY_STATE, sourceReturning } from "../../test/engineFakes";
import { EngineHttp, type FetchResource } from "./engineHttp";
import { FactClient } from "./factClient";

const FACTS = { facts: [], pending: [], canUndo: false };

function clientWith(fetchResource: FetchResource): FactClient {
  return new FactClient(new EngineHttp(sourceReturning(READY_STATE), fetchResource));
}

function respondingWithFacts() {
  return vi.fn<FetchResource>(() => Promise.resolve(jsonResponse(FACTS)));
}

describe("FactClient", () => {
  it("agrega un dato con su nombre, su tipo y su valor", async () => {
    const fetchResource = respondingWithFacts();
    const fact = { label: "Canon mensual", entityType: "money" as const, value: "$ 18.450.000" };

    const result = await clientWith(fetchResource).addFact("s 1", fact);

    const [url, init] = fetchResource.mock.calls[0] ?? [];
    expect(result).toEqual(FACTS);
    expect(url).toBe("http://127.0.0.1:5000/reviews/s%201/facts");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual(fact);
  });

  it("edita, retira, restaura y deshace en la ruta de cada dato", async () => {
    const fetchResource = respondingWithFacts();
    const client = clientWith(fetchResource);

    await client.editFact("s1", 4, "4857");
    await client.retireFact("s1", 4);
    await client.restoreFact("s1", 4);
    await client.undoFact("s1");
    await client.listFacts("s1");

    const calls = fetchResource.mock.calls.map(([url, init]) => [url, init.method]);
    expect(calls).toEqual([
      ["http://127.0.0.1:5000/reviews/s1/facts/4", "PUT"],
      ["http://127.0.0.1:5000/reviews/s1/facts/4/retire", "POST"],
      ["http://127.0.0.1:5000/reviews/s1/facts/4/restore", "POST"],
      ["http://127.0.0.1:5000/reviews/s1/facts/undo", "POST"],
      ["http://127.0.0.1:5000/reviews/s1/facts", "GET"],
    ]);
  });
});
