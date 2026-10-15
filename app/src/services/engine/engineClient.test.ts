import { describe, expect, it, vi } from "vitest";

import { EngineClient, EngineNotReadyError, EngineUnavailableError } from "./engineClient";
import type { EngineConnectionSource, EngineConnectionState } from "./engineConnection";

const READY_STATE: EngineConnectionState = {
  kind: "ready",
  connection: { baseUrl: "http://127.0.0.1:5000", token: "secret" },
};

function sourceReturning(state: EngineConnectionState): EngineConnectionSource {
  return { readConnectionState: () => Promise.resolve(state) };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("EngineClient", () => {
  it("consulta /health con el token de la ejecución", async () => {
    const fetchResource = vi.fn(() =>
      Promise.resolve(jsonResponse({ status: "ok", version: "1" })),
    );
    const client = new EngineClient(sourceReturning(READY_STATE), fetchResource);

    const health = await client.checkHealth();

    expect(health).toEqual({ status: "ok", version: "1" });
    expect(fetchResource).toHaveBeenCalledWith(
      "http://127.0.0.1:5000/health",
      expect.objectContaining({ headers: { Authorization: "Bearer secret" } }),
    );
  });

  it("informa que el motor aún está arrancando", async () => {
    const client = new EngineClient(sourceReturning({ kind: "starting" }), vi.fn());

    await expect(client.checkHealth()).rejects.toMatchObject({
      name: EngineNotReadyError.name,
      isStarting: true,
    });
  });

  it("informa que el motor no pudo arrancar", async () => {
    const client = new EngineClient(sourceReturning({ kind: "failed" }), vi.fn());

    await expect(client.checkHealth()).rejects.toMatchObject({ isStarting: false });
  });

  it("trata una respuesta de error como motor no disponible", async () => {
    const fetchResource = vi.fn(() => Promise.resolve(jsonResponse({}, 401)));
    const client = new EngineClient(sourceReturning(READY_STATE), fetchResource);

    await expect(client.checkHealth()).rejects.toBeInstanceOf(EngineUnavailableError);
  });

  it("trata un fallo de red como motor no disponible", async () => {
    const fetchResource = vi.fn(() => Promise.reject(new TypeError("Failed to fetch")));
    const client = new EngineClient(sourceReturning(READY_STATE), fetchResource);

    await expect(client.checkHealth()).rejects.toBeInstanceOf(EngineUnavailableError);
  });

  it("inicia una revisión enviando el nombre y los archivos al motor", async () => {
    const result = {
      session: { id: "s1", name: "Revisión", createdAt: "" },
      documents: [],
      alerts: [],
    };
    const fetchResource = vi.fn<(input: string, init: RequestInit) => Promise<Response>>(() =>
      Promise.resolve(jsonResponse(result)),
    );
    const client = new EngineClient(sourceReturning(READY_STATE), fetchResource);
    const file = new File(["Contrato No. 4857"], "notas.txt");

    const review = await client.startReview({ name: "Revisión", files: [file] });

    const [url, init] = fetchResource.mock.calls[0] ?? [];
    const body = init?.body as FormData;
    expect(review).toEqual(result);
    expect(url).toBe("http://127.0.0.1:5000/reviews");
    expect(init?.method).toBe("POST");
    expect(body.get("name")).toBe("Revisión");
    expect((body.get("files") as File).name).toBe("notas.txt");
  });
});
