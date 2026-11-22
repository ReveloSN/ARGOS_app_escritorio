import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";

import { useModalFocus } from "./useModalFocus";

function Modal({ onClose }: { readonly onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const trap = useModalFocus(dialog);
  return (
    <div ref={dialog} role="dialog" aria-modal="true" aria-label="uno" onKeyDown={trap}>
      <button type="button" autoFocus onClick={onClose}>
        {"cerrar"}
      </button>
    </div>
  );
}

function Harness() {
  const [isOpen, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        {"abrir"}
      </button>
      <input aria-label="otro" />
      {isOpen && (
        <Modal
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

const later = () => new Promise((done) => setTimeout(done, 10));

describe("useModalFocus al cerrarse", () => {
  it("devuelve el foco a quien abrió el diálogo", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "abrir" }));

    await userEvent.click(screen.getByRole("button", { name: "cerrar" }));
    await later();

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "abrir" }));
  });

  it("no se lo quita a otro control que ya tomó el foco", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "abrir" }));
    const other = screen.getByLabelText("otro");

    screen.getByRole("button", { name: "cerrar" }).click();
    other.focus();
    await later();

    expect(document.activeElement).toBe(other);
  });
});
