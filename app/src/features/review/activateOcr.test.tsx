import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { OcrSettingsResult } from "../../services/engine/ocrTypes";
import type {
  DocumentReadResult,
  ReviewRequest,
  ReviewResult,
} from "../../services/engine/reviewTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { REVIEW } from "../../test/reviewFixtures";

const CONTRACT: DocumentReadResult = {
  name: "contrato.pdf",
  status: "read",
  reason: null,
  fragmentCount: 2,
  method: "text",
  pageCount: null,
};
const SCANNED: DocumentReadResult = {
  name: "anexo_3.pdf",
  status: "unreadable",
  reason: "no_text",
  fragmentCount: 0,
  method: "text",
  pageCount: 3,
};
const FIRST: ReviewResult = { ...REVIEW, documents: [CONTRACT, SCANNED] };
const OCR_READ: DocumentReadResult = {
  ...SCANNED,
  status: "read",
  reason: null,
  fragmentCount: 2,
  method: "local_ocr",
};
const REREAD: ReviewResult = {
  ...FIRST,
  session: { ...FIRST.session, id: "s-2" },
  documents: [CONTRACT, OCR_READ],
};
const LOCAL_ONLY: OcrSettingsResult = {
  isLocalAvailable: true,
  usesCloud: false,
  projectId: "",
  location: "",
  processorId: "",
  hasCredentials: false,
  isKeychainAvailable: true,
  isCloudReady: false,
};
const CLOUD_READY: OcrSettingsResult = { ...LOCAL_ONLY, usesCloud: true, isCloudReady: true };

function reviewing() {
  return vi
    .fn((request: ReviewRequest) => {
      request.onProgress?.({ kind: "page_recognized", position: 1, done: 1, total: 3 });
      return Promise.resolve(REREAD);
    })
    .mockImplementationOnce(() => Promise.resolve(FIRST));
}

async function confirmReading(settings: OcrSettingsResult) {
  const startReview = reviewing();
  const ocrSettings = vi.fn(() => Promise.resolve(settings));
  renderApp(fakeEngineServices({ reviews: { startReview }, ocr: { ocrSettings } }));
  await act(() => Promise.resolve());
  await userEvent.click(screen.getAllByRole("button", { name: /Nueva revisión/ })[0] as Element);
  await userEvent.type(screen.getByLabelText("Nombre de la sesión"), "Revisión con escaneado");
  await userEvent.upload(screen.getByLabelText("Elegir archivos"), [
    new File(["%PDF"], "contrato.pdf"),
    new File(["%PDF"], "anexo_3.pdf"),
  ]);
  await userEvent.click(screen.getByRole("button", { name: /Leer y comparar 2 archivos/ }));
  await screen.findByText("No pudimos leer «anexo_3.pdf».");
  return startReview;
}

describe("Activar OCR", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("relee solo el escaneado con OCR local y reemplaza la lectura anterior", async () => {
    const startReview = await confirmReading(LOCAL_ONLY);
    expect(screen.getByText(/actívelo para lectura por OCR/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Activar OCR" }));

    expect(startReview).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ocr: { fileNames: ["anexo_3.pdf"], provider: "local" },
        replaces: REVIEW.session.id,
      }),
    );
    expect(await screen.findByText("Leído con OCR · 2 fragmentos con texto")).toBeInTheDocument();
  });

  it("con Document AI listo pide permiso diciendo cuántas páginas saldrán del equipo", async () => {
    const startReview = await confirmReading(CLOUD_READY);

    await userEvent.click(screen.getByRole("button", { name: "Activar OCR" }));

    const dialog = await screen.findByRole("dialog", { name: /Enviar «anexo_3.pdf»/ });
    expect(dialog).toHaveTextContent("Saldrán de este equipo 3 páginas de este archivo");
    await userEvent.click(screen.getByRole("button", { name: /Enviar 3 páginas/ }));
    expect(startReview).toHaveBeenLastCalledWith(
      expect.objectContaining({ ocr: { fileNames: ["anexo_3.pdf"], provider: "cloud" } }),
    );
  });

  it("sin confirmar no se envía nada: Esc cierra y el OCR local sigue a mano", async () => {
    const startReview = await confirmReading(CLOUD_READY);
    await userEvent.click(screen.getByRole("button", { name: "Activar OCR" }));
    await screen.findByRole("dialog");

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(startReview).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Activar OCR" }));
    await userEvent.click(await screen.findByRole("button", { name: "Usar OCR local" }));
    expect(startReview).toHaveBeenLastCalledWith(
      expect.objectContaining({ ocr: { fileNames: ["anexo_3.pdf"], provider: "local" } }),
    );
  });
});
