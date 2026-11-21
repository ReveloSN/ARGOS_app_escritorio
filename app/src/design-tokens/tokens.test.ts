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
  ["--color-text-primary", "--diff-added-bg"],
  ["--color-text-primary", "--diff-changed-bg"],
  ["--diff-removed-fg", "--diff-removed-bg"],
  // El aviso de conexión: su texto y el porqué sobre su propio fondo.
  ["--color-text-primary", "--engine-notice-bg"],
  ["--color-text-secondary", "--engine-notice-bg"],
  ["--color-text-tertiary", "--topbar-bg"],
  // El valor marcado dentro del fragmento citado y la confirmación de una decisión.
  ["--color-text-secondary", "--excerpt-mark-bg"],
  ["--color-text-primary", "--decision-feedback-bg"],
];

// WCAG 1.4.11: trazos que comunican algo (marcas de diferencia, el ojo) piden 3:1.
const MIN_GRAPHIC_CONTRAST = 3;
const GRAPHIC_ON_BACKGROUND: readonly (readonly [string, string])[] = [
  ["--color-border-control", "--color-background-surface"],
  ["--color-border-control", "--color-background-primary"],
  ["--color-border-control", "--color-background-subtle"],
  ["--focus-ring-color", "--color-background-surface"],
  ["--focus-ring-color", "--color-background-raised"],
  ["--focus-ring-color", "--color-background-primary"],
  ["--focus-ring-color", "--engine-notice-bg"],
  ["--color-border-control", "--topbar-bg"],
  ["--excerpt-mark-line", "--excerpt-mark-bg"],
  ["--color-action-text", "--decision-feedback-bg"],
  ["--diff-removed-line", "--diff-removed-bg"],
  ["--diff-added-line", "--diff-added-bg"],
  ["--diff-changed-outline", "--diff-changed-bg"],
  ["--diff-moved-line", "--color-background-surface"],
  ["--diff-selected-outline", "--color-background-surface"],
  ["--eye-accent", "--color-background-surface"],
  ["--eye-accent", "--color-background-subtle"],
  ["--eye-alert", "--color-background-surface"],
  ["--eye-muted", "--color-background-surface"],
];

describe.each([
  ["claro", light],
  ["oscuro", dark],
])("tema %s", (_themeName, theme) => {
  it.each(TEXT_ON_BACKGROUND)("%s sobre %s cumple 4.5:1", (text, background) => {
    const ratio = contrastRatio(resolve(text, theme), resolve(background, theme));

    expect(ratio).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it.each(GRAPHIC_ON_BACKGROUND)("%s sobre %s cumple 3:1", (graphic, background) => {
    const ratio = contrastRatio(resolve(graphic, theme), resolve(background, theme));

    expect(ratio).toBeGreaterThanOrEqual(MIN_GRAPHIC_CONTRAST);
  });
});

// Fondo de trabajo, paneles y controles elevados deben leerse como planos distintos sin bordes.
const MIN_PLANE_STEP = 1.1;
const PLANES = [
  "--color-background-primary",
  "--color-background-surface",
  "--color-background-raised",
] as const;

describe("planos del tema oscuro", () => {
  it.each([0, 1])("el plano %i y el siguiente se distinguen", (index) => {
    const lower = resolve(PLANES[index] ?? "", dark);
    const upper = resolve(PLANES[index + 1] ?? "", dark);

    expect(contrastRatio(lower, upper)).toBeGreaterThanOrEqual(MIN_PLANE_STEP);
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
