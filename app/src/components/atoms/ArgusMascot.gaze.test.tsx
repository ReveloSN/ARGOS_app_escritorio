import { fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ArgusMascot } from "./ArgusMascot";

/** Cuadros de animación encolados: la prueba decide cuándo se pintan, como el navegador. */
const pending = new Map<number, FrameRequestCallback>();
let nextFrame = 1;

function paintFrames() {
  const frames = [...pending.values()];
  pending.clear();
  frames.forEach((frame) => {
    frame(0);
  });
}

function figureOf(container: HTMLElement): HTMLElement {
  const figure = container.firstElementChild as HTMLElement;
  vi.spyOn(figure, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 100, 100));
  return figure;
}

function pointAt(x: number) {
  // jsdom no implementa PointerEvent; un MouseEvent con ese tipo trae las coordenadas.
  fireEvent(window, new MouseEvent("pointermove", { clientX: x, clientY: 50 }));
}

const gazeX = (figure: HTMLElement) => figure.style.getPropertyValue("--gaze-x");

describe("ArgusMascot · mirada que sigue al puntero", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((frame) => {
      pending.set(nextFrame, frame);
      return nextFrame++;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      pending.delete(id);
    });
  });

  afterEach(() => {
    pending.clear();
    vi.restoreAllMocks();
    delete document.documentElement.dataset.motion;
  });

  it("en tamaño grande mira hacia el puntero y lo sigue en cada movimiento", () => {
    const figure = figureOf(render(<ArgusMascot state="reading" size="lg" />).container);

    pointAt(900);
    paintFrames();
    expect(Number(gazeX(figure))).toBeGreaterThan(0);

    pointAt(-900);
    paintFrames();
    expect(Number(gazeX(figure))).toBeLessThan(0);
  });

  it("en la barra lateral (tamaño pequeño) no sigue al puntero", () => {
    const figure = figureOf(render(<ArgusMascot state="reading" />).container);

    pointAt(900);
    paintFrames();

    expect(gazeX(figure)).toBe("");
  });

  it("con movimiento reducido se queda mirando al frente", () => {
    document.documentElement.dataset.motion = "reduced";
    const figure = figureOf(render(<ArgusMascot state="reading" size="lg" />).container);

    pointAt(900);
    paintFrames();

    expect(gazeX(figure)).toBe("0.000");
  });

  it("si se activa Reducir movimiento en caliente, vuelve al frente sin esperar al puntero", async () => {
    const figure = figureOf(render(<ArgusMascot state="reading" size="lg" />).container);
    pointAt(900);
    paintFrames();

    document.documentElement.dataset.motion = "reduced";

    await waitFor(() => {
      expect(gazeX(figure)).toBe("0.000");
    });
  });

  it("al salir el puntero de la ventana mira al frente aunque quedara un cuadro pendiente", () => {
    const figure = figureOf(render(<ArgusMascot state="reading" size="lg" />).container);

    pointAt(900);
    fireEvent.pointerLeave(document.documentElement);
    paintFrames();

    expect(gazeX(figure)).toBe("0.000");
  });

  it("al tocarla reacciona una vez y queda lista para el siguiente toque", () => {
    const figure = figureOf(render(<ArgusMascot state="reading" size="lg" />).container);

    fireEvent.click(figure);
    expect(figure).toHaveAttribute("data-poked");

    fireEvent.animationEnd(figure);
    expect(figure).not.toHaveAttribute("data-poked");
  });

  it("si la animación nunca llegó a terminar, el siguiente toque la reinicia", () => {
    const figure = figureOf(render(<ArgusMascot state="reading" size="lg" />).container);
    const marks: boolean[] = [];
    // El reflow entre quitar y poner la marca es lo que obliga al navegador a reiniciarla.
    vi.spyOn(figure, "getBoundingClientRect").mockImplementation(() => {
      marks.push(figure.hasAttribute("data-poked"));
      return new DOMRect();
    });

    fireEvent.click(figure);
    fireEvent.click(figure);

    expect(marks).toEqual([false, false]);
    expect(figure).toHaveAttribute("data-poked");
  });

  it("si la animación se cancela (por ejemplo, al ocultarse) no queda marcada", () => {
    const figure = figureOf(render(<ArgusMascot state="reading" size="lg" />).container);

    fireEvent.click(figure);
    fireEvent(figure, new Event("animationcancel", { bubbles: true }));

    expect(figure).not.toHaveAttribute("data-poked");
  });

  it("el fin de la animación del ojo interno no corta el salto de la figura", () => {
    const figure = figureOf(render(<ArgusMascot state="reading" size="lg" />).container);

    fireEvent.click(figure);
    const eye = figure.querySelector("svg[data-state]");
    if (!eye) throw new Error("La mascota debería dibujar el ojo dentro de la figura");
    fireEvent.animationEnd(eye);

    expect(figure).toHaveAttribute("data-poked");
  });

  describe("reacción a cambios reales de estado", () => {
    it("al aparecer riesgo alto, un archivo ilegible o un resultado limpio, da un salto", () => {
      (["alert", "error", "success"] as const).forEach((state) => {
        const { container, rerender, unmount } = render(<ArgusMascot state="reading" />);

        rerender(<ArgusMascot state={state} />);

        expect(container.firstElementChild).toHaveAttribute("data-poked");
        unmount();
      });
    });

    it("al montarse ya en riesgo alto no salta: solo reacciona a un cambio", () => {
      const { container } = render(<ArgusMascot state="alert" />);

      expect(container.firstElementChild).not.toHaveAttribute("data-poked");
    });

    it("los cambios rutinarios (leyendo, dudas, explicando) no la hacen saltar", () => {
      const { container, rerender } = render(<ArgusMascot state="reading" />);

      rerender(<ArgusMascot state="doubt" />);
      rerender(<ArgusMascot state="explaining" />);

      expect(container.firstElementChild).not.toHaveAttribute("data-poked");
    });
  });

  it("al dejar de ser grande no conserva la última mirada", () => {
    const { container, rerender } = render(<ArgusMascot state="reading" size="lg" />);
    const figure = figureOf(container);
    pointAt(900);
    paintFrames();

    rerender(<ArgusMascot state="reading" size="sm" />);

    expect(gazeX(figure)).toBe("");
  });
});
