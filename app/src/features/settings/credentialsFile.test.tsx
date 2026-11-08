import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { OcrSettingsResult } from "../../services/engine/ocrTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

const CLOUD: OcrSettingsResult = {
  isLocalAvailable: true,
  usesCloud: true,
  projectId: "",
  location: "",
  processorId: "",
  hasCredentials: false,
  isKeychainAvailable: true,
  isCloudReady: false,
};
const SECRET = "-----BEGIN PRIVATE KEY-----abc";
const KEY_JSON = JSON.stringify({ type: "service_account", private_key: SECRET });
const KEY_FILE = new File([KEY_JSON], "argus-ocr.json", { type: "application/json" });
// jsdom no implementa Blob.text(); el navegador (y WebView2) sí.
Object.defineProperty(KEY_FILE, "text", { value: () => Promise.resolve(KEY_JSON) });

// CLAUDE.md §8: la clave va del archivo al llavero sin mostrarse en la pantalla.
describe("clave de Document AI elegida desde un archivo", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(regresión) no muestra el contenido del archivo, solo su nombre, y lo guarda al confirmar", async () => {
    const storeCredentials = vi.fn(() => Promise.resolve({ ...CLOUD, hasCredentials: true }));
    renderApp(
      fakeEngineServices({ ocr: { ocrSettings: () => Promise.resolve(CLOUD), storeCredentials } }),
    );
    await act(() => Promise.resolve());
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Ajustes/ }));

    await user.upload(await screen.findByLabelText("Elegir archivo JSON"), KEY_FILE);
    await screen.findByText(/argus-ocr\.json/);

    expect(screen.getByLabelText("Clave JSON de la cuenta de servicio")).toHaveValue("");
    expect(document.body.textContent).not.toContain(SECRET);
    await user.click(screen.getByRole("button", { name: "Guardar clave" }));
    await waitFor(() => {
      expect(storeCredentials).toHaveBeenCalledWith(expect.stringContaining(SECRET));
    });
  });
});
