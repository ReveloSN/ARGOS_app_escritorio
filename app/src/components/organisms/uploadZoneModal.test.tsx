import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../test/renderWithProviders";
import { UploadZone } from "./UploadZone";

describe("UploadZone con un diálogo modal abierto", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("Ctrl O no abre el selector de archivos que queda detrás", async () => {
    renderWithProviders(<UploadZone onFilesSelected={vi.fn()} />);
    const input = document.querySelector<HTMLInputElement>("input[type='file']");
    const picker = vi.fn();
    input?.addEventListener("click", picker);
    render(<div role="dialog" aria-modal="true" />);

    await userEvent.keyboard("{Control>}o{/Control}");

    expect(picker).not.toHaveBeenCalled();
  });

  it("sin diálogo, Ctrl O sigue abriéndolo", async () => {
    renderWithProviders(<UploadZone onFilesSelected={vi.fn()} />);
    const input = document.querySelector<HTMLInputElement>("input[type='file']");
    const picker = vi.fn();
    input?.addEventListener("click", picker);

    await userEvent.keyboard("{Control>}o{/Control}");

    expect(picker).toHaveBeenCalledTimes(1);
  });
});
