import { describe, expect, it, vi } from "vitest";

import { jsonResponse, READY_STATE, sourceReturning } from "../../test/engineFakes";
import { AccountClient } from "./accountClient";
import type { AccountStateResult } from "./accountTypes";
import { EngineHttp, EngineRejectedError, type FetchResource } from "./engineHttp";

const STATE: AccountStateResult = {
  status: "signed_out",
  account: null,
  email: null,
  gateSkipped: false,
  isOffline: false,
  isPersisted: true,
};
const BASE = "http://127.0.0.1:5000/account";

function clientWith(fetchResource: FetchResource): AccountClient {
  return new AccountClient(new EngineHttp(sourceReturning(READY_STATE), fetchResource));
}

function answering(body: unknown, status = 200) {
  return vi.fn<FetchResource>(() => Promise.resolve(jsonResponse(body, status)));
}

describe("AccountClient", () => {
  it("lee el estado y omitir van por rutas sin cuerpo", async () => {
    const fetchResource = answering(STATE);
    const client = clientWith(fetchResource);

    await client.account();
    await client.skip();

    const calls = fetchResource.mock.calls.map(([url, init]) => [url, init.method, init.body]);
    expect(calls).toEqual([
      [BASE, "GET", undefined],
      [`${BASE}/skip`, "POST", undefined],
    ]);
  });

  it("envía cada formulario a su ruta, con el cuerpo que espera el motor", async () => {
    const fetchResource = answering({ state: STATE, needsConfirmation: false });
    const client = clientWith(fetchResource);

    await client.signUp({ email: "a@b.co", password: "x1", displayName: "Ana" });
    await client.signIn({ email: "a@b.co", password: "x1" });
    await client.verify({ email: "a@b.co", code: "123456" });
    await client.confirmPasswordReset({ email: "a@b.co", code: "123456", password: "n1" });

    const calls = fetchResource.mock.calls.map(([url, init]) => [url, init.body]);
    expect(calls).toEqual([
      [`${BASE}/sign-up`, '{"email":"a@b.co","password":"x1","displayName":"Ana"}'],
      [`${BASE}/sign-in`, '{"email":"a@b.co","password":"x1"}'],
      [`${BASE}/verify`, '{"email":"a@b.co","code":"123456"}'],
      [`${BASE}/password-reset/confirm`, '{"email":"a@b.co","code":"123456","password":"n1"}'],
    ]);
  });

  it("pide la recuperación sin esperar un cuerpo de respuesta", async () => {
    const fetchResource = vi.fn<FetchResource>(() =>
      Promise.resolve(new Response(null, { status: 204 })),
    );

    await clientWith(fetchResource).requestPasswordReset("a@b.co");

    const [url, init] = fetchResource.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE}/password-reset`);
    expect(init?.body).toBe('{"email":"a@b.co"}');
  });

  it("pide otro código de alta sin esperar un cuerpo de respuesta", async () => {
    const fetchResource = vi.fn<FetchResource>(() =>
      Promise.resolve(new Response(null, { status: 204 })),
    );

    await clientWith(fetchResource).resendSignUpCode("a@b.co");

    const [url, init] = fetchResource.mock.calls[0] ?? [];
    expect([url, init?.method]).toEqual([`${BASE}/verify/resend`, "POST"]);
    expect(init?.body).toBe('{"email":"a@b.co"}');
  });

  it("deja pasar el motivo del motor sin tocarlo", async () => {
    const client = clientWith(answering({ detail: "invalid_credentials" }, 401));

    const failure = client.signIn({ email: "a@b.co", password: "x" });

    await expect(failure).rejects.toBeInstanceOf(EngineRejectedError);
    await expect(failure).rejects.toMatchObject({ detail: "invalid_credentials" });
  });

  it("espera 40 s lo que llega a Supabase y menos lo que es local", async () => {
    const spy = vi.spyOn(AbortSignal, "timeout");
    const client = clientWith(answering({ state: STATE, needsConfirmation: false }));

    await client.account();
    await client.skip();
    await client.signIn({ email: "a@b.co", password: "x" });
    await client.refresh();
    await client.signOut();
    await client.requestPasswordReset("a@b.co").catch(() => undefined);
    await client.resendSignUpCode("a@b.co").catch(() => undefined);

    const timeouts = spy.mock.calls.map(([milliseconds]) => milliseconds);
    expect(timeouts).toEqual([10_000, 10_000, 40_000, 40_000, 40_000, 40_000, 40_000]);
    spy.mockRestore();
  });
});
