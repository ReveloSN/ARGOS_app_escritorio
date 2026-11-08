import { useEffect, type RefObject } from "react";

/** Dirección de la mirada, normalizada: (0, 0) al frente; el largo nunca supera 1. */
export interface Gaze {
  readonly x: number;
  readonly y: number;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

const AHEAD: Gaze = { x: 0, y: 0 };
/** A cuántos tamaños de la figura el ojo llega al tope: cerca gira poco, lejos del todo. */
const REACH_IN_SIZES = 3;
const GAZE_DECIMALS = 3;
const GAZE_PROPERTIES = ["--gaze-x", "--gaze-y"] as const;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const NO_FRAME = 0;

/** Hacia dónde mira una figura que ocupa `box` si el puntero está en `pointer`. */
export function gazeToward(pointer: Point, box: Box): Gaze {
  const reach = Math.max(box.width, box.height) * REACH_IN_SIZES;
  if (reach === 0) return AHEAD;
  const dx = pointer.x - (box.left + box.width / 2);
  const dy = pointer.y - (box.top + box.height / 2);
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return AHEAD;
  const strength = Math.min(1, distance / reach);
  return { x: (dx / distance) * strength, y: (dy / distance) * strength };
}

function reducedMotionQuery(): MediaQueryList | undefined {
  return typeof window.matchMedia === "function"
    ? window.matchMedia(REDUCED_MOTION_QUERY)
    : undefined;
}

/** Movimiento reducido del sistema o de Ajustes › Asistente › Reducir movimiento. */
export function isMotionReduced(): boolean {
  if (document.documentElement.dataset.motion === "reduced") return true;
  return reducedMotionQuery()?.matches ?? false;
}

/**
 * Lleva la mirada de una figura hacia el puntero, un cuadro por animación como máximo.
 * Vuelve al frente al salir el puntero de la ventana o al pedirse movimiento reducido,
 * aunque sea en caliente; al detenerse borra la mirada para no dejarla torcida.
 */
class PointerGazeFollower {
  private frame = NO_FRAME;
  private pointer: Point = AHEAD;
  private readonly motionObserver = new MutationObserver(() => {
    this.onMotionChange();
  });

  constructor(private readonly figure: HTMLElement) {}

  start(): void {
    window.addEventListener("pointermove", this.onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", this.lookAhead);
    reducedMotionQuery()?.addEventListener("change", this.onMotionChange);
    this.motionObserver.observe(document.documentElement, { attributeFilter: ["data-motion"] });
  }

  stop(): void {
    this.cancelFrame();
    window.removeEventListener("pointermove", this.onMove);
    document.documentElement.removeEventListener("pointerleave", this.lookAhead);
    reducedMotionQuery()?.removeEventListener("change", this.onMotionChange);
    this.motionObserver.disconnect();
    GAZE_PROPERTIES.forEach((property) => this.figure.style.removeProperty(property));
  }

  private readonly onMove = (event: PointerEvent): void => {
    this.pointer = { x: event.clientX, y: event.clientY };
    if (this.frame === NO_FRAME) this.frame = window.requestAnimationFrame(this.follow);
  };

  private readonly follow = (): void => {
    this.frame = NO_FRAME;
    if (isMotionReduced()) this.apply(AHEAD);
    else this.apply(gazeToward(this.pointer, this.figure.getBoundingClientRect()));
  };

  private readonly onMotionChange = (): void => {
    if (isMotionReduced()) this.lookAhead();
  };

  private readonly lookAhead = (): void => {
    this.cancelFrame();
    this.apply(AHEAD);
  };

  private cancelFrame(): void {
    if (this.frame !== NO_FRAME) window.cancelAnimationFrame(this.frame);
    this.frame = NO_FRAME;
  }

  private apply(gaze: Gaze): void {
    this.figure.style.setProperty(GAZE_PROPERTIES[0], gaze.x.toFixed(GAZE_DECIMALS));
    this.figure.style.setProperty(GAZE_PROPERTIES[1], gaze.y.toFixed(GAZE_DECIMALS));
  }
}

/**
 * Escribe la mirada como variables CSS (`--gaze-x`, `--gaze-y`) sin volver a renderizar.
 * Con movimiento reducido el ojo se queda al frente.
 */
export function usePointerGaze(ref: RefObject<HTMLElement | null>, isEnabled: boolean): void {
  useEffect(() => {
    const figure = ref.current;
    if (!isEnabled || !figure) return undefined;
    const follower = new PointerGazeFollower(figure);
    follower.start();
    return () => {
      follower.stop();
    };
  }, [ref, isEnabled]);
}
