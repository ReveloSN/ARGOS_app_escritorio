import { describe, expect, it, vi } from "vitest";

import { jsonResponse, READY_STATE, sourceReturning } from "../../test/engineFakes";
import { AiClient } from "./aiClient";
import { EngineHttp, type FetchResource } from "./engineHttp";

function clientWith(fetchResource: FetchResource): AiClient {
  return new AiClient(new EngineHttp(sourceReturning(READY_STATE), fetchResource));
}

describe("AiClient", () => {
  it("pide la explicación del cambio en el idioma de la interfaz", async () => {
    const explanation = { source: "template", parts: [], text: "", fallbackReason: null };
    const fetchResource = vi.fn<FetchResource>(() => Promise.resolve(jsonResponse(explanation)));

    await clientWith(fetchResource).explainChange("c 1", 3, "en");

    const [url] = fetchResource.mock.calls[0] ?? [];
    expect(url).toBe("http://127.0.0.1:5000/comparisons/c%201/changes/3/explanation?locale=en");
  });

  it("pide la explicación de una alerta de la revisión por el mismo camino", async () => {
    const explanation = { source: "template", parts: [], text: "", fallbackReason: null };
    const fetchResource = vi.fn<FetchResource>(() => Promise.resolve(jsonResponse(explanation)));

    await clientWith(fetchResource).explainAlert("s 1", 2, "es");

    const [url] = fetchResource.mock.calls[0] ?? [];
    expect(url).toBe("http://127.0.0.1:5000/reviews/s%201/alerts/2/explanation?locale=es");
  });

  it("guarda la clave en el llavero y la quita", async () => {
    const state = { explainsChanges: false, hasKey: true, isKeychainAvailable: true };
    const fetchResource = vi.fn<FetchResource>(() => Promise.resolve(jsonResponse(state)));
    const client = clientWith(fetchResource);

    await client.storeKey("sk-prueba");
    await client.removeKey();
    await client.setExplainsChanges(true);

    const calls = fetchResource.mock.calls.map(([url, init]) => [url, init.method, init.body]);
    expect(calls).toEqual([
      ["http://127.0.0.1:5000/settings/ai/key", "PUT", JSON.stringify({ key: "sk-prueba" })],
      ["http://127.0.0.1:5000/settings/ai/key", "DELETE", undefined],
      ["http://127.0.0.1:5000/settings/ai", "PUT", JSON.stringify({ explainsChanges: true })],
    ]);
  });
});
