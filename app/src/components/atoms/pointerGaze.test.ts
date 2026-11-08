import { describe, expect, it } from "vitest";

import { gazeToward, isMotionReduced } from "./pointerGaze";

const BOX = { left: 100, top: 100, width: 100, height: 100 };
const CENTER = { x: 150, y: 150 };

describe("gazeToward", () => {
  it("con el puntero en el centro mira al frente", () => {
    expect(gazeToward(CENTER, BOX)).toEqual({ x: 0, y: 0 });
  });

  it("mira hacia el lado del puntero", () => {
    const right = gazeToward({ x: 400, y: 150 }, BOX);
    const up = gazeToward({ x: 150, y: 0 }, BOX);

    expect(right.x).toBeGreaterThan(0);
    expect(right.y).toBe(0);
    expect(up.y).toBeLessThan(0);
  });

  it("de cerca gira poco y de lejos llega al tope sin pasarlo", () => {
    const near = gazeToward({ x: 170, y: 150 }, BOX);
    const far = gazeToward({ x: 5000, y: 5000 }, BOX);

    expect(near.x).toBeGreaterThan(0);
    expect(near.x).toBeLessThan(0.5);
    expect(Math.hypot(far.x, far.y)).toBeCloseTo(1, 5);
  });

  it("una caja sin tamaño (aún sin maquetar) no mueve el ojo", () => {
    expect(gazeToward({ x: 999, y: 999 }, { left: 0, top: 0, width: 0, height: 0 })).toEqual({
      x: 0,
      y: 0,
    });
  });
});

describe("isMotionReduced", () => {
  it("respeta Ajustes › Reducir movimiento aunque el sistema no lo pida", () => {
    document.documentElement.dataset.motion = "reduced";

    expect(isMotionReduced()).toBe(true);

    delete document.documentElement.dataset.motion;
  });
});
