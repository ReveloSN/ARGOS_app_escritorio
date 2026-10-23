import { describe, expect, it, vi } from "vitest";

import { jsonResponse, READY_STATE, sourceReturning } from "../../test/engineFakes";
import { EngineHttp, type FetchResource } from "./engineHttp";
import { ReportClient } from "./reportClient";

const DOCUMENT = {
  title: "Informe de revisión documental",
  subtitles: [],
  brand: "ARGUS",
  sections: [],
  footer: "Generado con ARGUS",
  pageLabel: "Página {page} de {total}",
};

function clientWith(fetchResource: FetchResource): ReportClient {
  return new ReportClient(new EngineHttp(sourceReturning(READY_STATE), fetchResource));
}

describe("ReportClient", () => {
  it("exporta el informe redactado en el formato elegido", async () => {
    const saved = { folder: "Documentos/ARGUS/E", fileName: "Informe.pdf" };
    const fetchResource = vi.fn<FetchResource>(() => Promise.resolve(jsonResponse(saved)));

    const result = await clientWith(fetchResource).exportReport("s 1", "pdf", DOCUMENT);

    const [url, init] = fetchResource.mock.calls[0] ?? [];
    expect(result).toEqual(saved);
    expect(url).toBe("http://127.0.0.1:5000/reviews/s%201/report");
    expect(JSON.parse(init?.body as string)).toEqual({ format: "pdf", document: DOCUMENT });
  });

  it("abre el informe guardado por su nombre", async () => {
    const fetchResource = vi.fn<FetchResource>(() =>
      Promise.resolve(new Response(null, { status: 204 })),
    );

    await clientWith(fetchResource).openReport("s1", "Informe.pdf");

    const [url, init] = fetchResource.mock.calls[0] ?? [];
    expect(url).toBe("http://127.0.0.1:5000/reviews/s1/report/open");
    expect(JSON.parse(init?.body as string)).toEqual({ fileName: "Informe.pdf" });
  });
});
