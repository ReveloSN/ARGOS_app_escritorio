import { describe, expect, it } from "vitest";
import { nextUndecided } from "./nextUndecided";

describe("nextUndecided", () => {
  it("(regresión) salta los cambios ya decididos", () => {
    expect(nextUndecided([3, 1, 2, 4], new Set([3, 1, 2]), 3)).toBe(4);
  });

  it("da la vuelta a la lista cuando lo único que queda está antes", () => {
    expect(nextUndecided([3, 1, 2, 4], new Set([1, 2, 4]), 4)).toBe(3);
  });

  it("devuelve undefined cuando todos están decididos", () => {
    expect(nextUndecided([1, 2], new Set([1, 2]), 1)).toBeUndefined();
  });

  it("sin selección empieza por el primero sin decidir", () => {
    expect(nextUndecided([5, 6], new Set([5]), undefined)).toBe(6);
  });
});
