import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { contrastRatio } from "./contrast";

// Vitest vacía los imports de CSS (incluso con ?raw), así que se leen como archivos.
function readTokens(fileName: string): string {
  return readFileSync(new URL(fileName, import.meta.url), "utf8");
}

const globalCss = readTokens("./global.css");
const semanticCss = readTokens("./semantic.css");
const componentCss = readTokens("./component.css");

const MIN_TEXT_CONTRAST = 4.5;
const LIGHT_SELECTOR = ":root";
const DARK_SELECTOR = '[data-theme="dark"]';

type Declarations = Map<string, string>;

function parseBlocks(css: string): Map<string, Declarations> {
  const blocks = new Map<string, Declarations>();
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, selector = "", body = ""] of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const declarations = new Map<string, string>();
    for (const [, name = "", value = ""] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      declarations.set(name, value.trim());
    }
    blocks.set(selector.trim(), declarations);
  }
  return blocks;
}

const globals = parseBlocks(globalCss).get(LIGHT_SELECTOR) ?? new Map<string, string>();
const semanticBlocks = parseBlocks(semanticCss);
const light = semanticBlocks.get(LIGHT_SELECTOR) ?? new Map<string, string>();
const dark = semanticBlocks.get(DARK_SELECTOR) ?? new Map<string, string>();
const components = parseBlocks(componentCss).get(LIGHT_SELECTOR) ?? new Map<string, string>();

function resolve(name: string, theme: Declarations): string {
  const value = theme.get(name) ?? light.get(name) ?? components.get(name) ?? globals.get(name);
  if (value === undefined) throw new Error(`Token sin definir: ${name}`);
  const reference = /^var\((--[\w-]+)\)$/.exec(value);
  return reference?.[1] ? resolve(reference[1], theme) : value;
}

const TEXT_ON_BACKGROUND: readonly (readonly [string, string])[] = [
  ["--color-text-primary", "--color-background-primary"],
  ["--color-text-primary", "--color-background-surface"],
  ["--color-text-primary", "--color-background-subtle"],
  ["--color-text-primary", "--color-background-raised"],
  ["--color-text-secondary", "--color-background-primary"],
  ["--color-text-secondary", "--color-background-surface"],
  ["--color-text-secondary", "--color-background-subtle"],
  ["--color-text-tertiary", "--color-background-primary"],
  ["--color-text-tertiary", "--color-background-surface"],
  ["--color-text-tertiary", "--color-background-subtle"],
  ["--color-action-primary-fg", "--color-action-primary"],
  ["--color-action-primary-fg", "--color-action-primary-hover"],
  ["--color-action-text", "--color-action-subtle"],
  ["--color-action-text", "--color-background-surface"],
  ["--color-risk-high", "--color-risk-high-bg"],
  ["--color-risk-high", "--color-background-surface"],
  ["--color-risk-high", "--color-diff-highlight"],
  ["--color-risk-medium", "--color-risk-medium-bg"],
  ["--color-risk-low", "--color-risk-low-bg"],
  ["--color-text-inverse", "--color-background-inverse"],
];

describe.each([
  ["claro", light],
  ["oscuro", dark],
])("tema %s", (_themeName, theme) => {
  it.each(TEXT_ON_BACKGROUND)("%s sobre %s cumple 4.5:1", (text, background) => {
    const ratio = contrastRatio(resolve(text, theme), resolve(background, theme));

    expect(ratio).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });
});

describe("tokens", () => {
  it("el tema oscuro redefine todos los colores semánticos del claro", () => {
    const lightColors = [...light.keys()].filter((name) => name.startsWith("--color-"));

    expect(lightColors.filter((name) => !dark.has(name))).toEqual([]);
  });

  it("toda referencia var() apunta a un token definido", () => {
    const allCss = [globalCss, semanticCss, componentCss].join("\n");
    const referenced = new Set([...allCss.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1] ?? ""));

    expect([...referenced].filter((name) => !allDefined().has(name))).toEqual([]);
  });

  it("calcula el contraste según WCAG", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrastRatio("#767676", "#FFFFFF")).toBeCloseTo(4.54, 2);
  });
});

function allDefined(): Set<string> {
  return new Set([...globals.keys(), ...light.keys(), ...dark.keys(), ...components.keys()]);
}
