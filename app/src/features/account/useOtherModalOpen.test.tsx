import { act, render, screen } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { describe, expect, it } from "vitest";

import { useOtherModalOpen } from "./useOtherModalOpen";

function ModalMountedWith({ isShown }: { readonly isShown: boolean }) {
  useLayoutEffect(() => {
    if (!isShown) return undefined;
    const modal = document.createElement("div");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    document.body.append(modal);
    return () => {
      modal.remove();
    };
  }, [isShown]);
  return null;
}

function Probe({ isEnabled }: { readonly isEnabled: boolean }) {
  return <output>{useOtherModalOpen(isEnabled) ? "otro" : "libre"}</output>;
}

describe("useOtherModalOpen", () => {
  it("ve un diálogo que se montó en el mismo commit que lo activó", () => {
    const { rerender } = render(
      <>
        <ModalMountedWith isShown={false} />
        <Probe isEnabled={false} />
      </>,
    );

    act(() => {
      rerender(
        <>
          <ModalMountedWith isShown />
          <Probe isEnabled />
        </>,
      );
    });

    expect(screen.getByRole("status")).toHaveTextContent("otro");
  });

  it("sin activar, no mira", () => {
    render(
      <>
        <ModalMountedWith isShown />
        <Probe isEnabled={false} />
      </>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("libre");
  });
});
