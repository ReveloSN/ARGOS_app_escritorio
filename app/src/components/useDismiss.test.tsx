import { render } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { useDismiss } from "./useDismiss";

function Panel({ onDismiss }: { readonly onDismiss: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  useDismiss(panel, onDismiss);
  return <div ref={panel} />;
}

describe("useDismiss", () => {
  it("la tecla que cerró algo queda marcada como atendida", () => {
    const onDismiss = vi.fn();
    render(<Panel onDismiss={onDismiss} />);
    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });

    document.body.dispatchEvent(escape);

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(escape.defaultPrevented).toBe(true);
  });

  it("otras teclas no se tocan", () => {
    render(<Panel onDismiss={vi.fn()} />);
    const other = new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true });

    document.body.dispatchEvent(other);

    expect(other.defaultPrevented).toBe(false);
  });
});
