import { describe, expect, it, vi } from "vitest";

import { jsonResponse, READY_STATE, sourceReturning } from "../../test/engineFakes";
import { EngineClient } from "./engineClient";
import {
  EngineHttp,
  EngineNotReadyError,
  EngineRejectedError,
  EngineUnavailableError,
  type FetchResource,
} from "./engineHttp";

function clientWith(fetchResource: FetchResource, state = READY_STATE): EngineClient {
  return new EngineClient(new EngineHttp(sourceReturning(state), fetchResource));
}

describe("EngineClient y EngineHttp", () => {
  it("consulta /health con el token de la ejecución", async () => {
    const fetchResource = vi.fn(() =>
      Promise.resolve(jsonResponse({ status: "ok", version: "1" })),
    );

    const health = await clientWith(fetchResource).checkHealth();

    expect(health).toEqual({ status: "ok", version: "1" });
    expect(fetchResource).toHaveBeenCalledWith(
      "http://127.0.0.1:5000/health",
      expect.objectContaining({ headers: { Authorization: "Bearer secret" } }),
    );
  });

  it("informa que el motor aún está arrancando", async () => {
    await expect(clientWith(vi.fn(), { kind: "starting" }).checkHealth()).rejects.toMatchObject({
      name: EngineNotReadyError.name,
      isStarting: true,
    });
  });

  it("informa que el motor no pudo arrancar", async () => {
    await expect(clientWith(vi.fn(), { kind: "failed" }).checkHealth()).rejects.toMatchObject({
      isStarting: false,
    });
  });

  it("trata una respuesta de error sin motivo como motor no disponible", async () => {
    const fetchResource = vi.fn(() => Promise.resolve(jsonResponse({}, 401)));

    await expect(clientWith(fetchResource).checkHealth()).rejects.toBeInstanceOf(
      EngineUnavailableError,
    );
  });

  it("trata un fallo de red como motor no disponible", async () => {
    const fetchResource = vi.fn(() => Promise.reject(new TypeError("Failed to fetch")));

    await expect(clientWith(fetchResource).checkHealth()).rejects.toBeInstanceOf(
      EngineUnavailableError,
    );
  });

  it("conserva el motivo que da el motor al rechazar una petición", async () => {
    const fetchResource = vi.fn(() =>
      Promise.resolve(jsonResponse({ detail: "archived_file_missing" }, 410)),
    );
    const http = new EngineHttp(sourceReturning(READY_STATE), fetchResource);

    await expect(http.empty({ path: "/x", timeoutMs: 100, method: "POST" })).rejects.toMatchObject({
      name: EngineRejectedError.name,
      detail: "archived_file_missing",
    });
  });

  it("envía los objetos como JSON con su tipo de contenido", async () => {
    const fetchResource = vi.fn<FetchResource>(() => Promise.resolve(jsonResponse({})));
    const http = new EngineHttp(sourceReturning(READY_STATE), fetchResource);

    await http.json({ path: "/preferences", timeoutMs: 100, method: "PUT", body: { a: 1 } });

    const [, init] = fetchResource.mock.calls[0] ?? [];
    expect(init?.body).toBe('{"a":1}');
    expect(init?.headers).toEqual({
      Authorization: "Bearer secret",
      "Content-Type": "application/json",
    });
  });
});
