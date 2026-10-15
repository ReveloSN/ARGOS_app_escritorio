import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const APP_ROOT = fileURLToPath(new URL("..", import.meta.url));
const BUILD_TIMEOUT_MS = 120_000;

// Lo que nunca debe llegar al usuario final: el catálogo y los datos de ejemplo de los mockups.
const FORBIDDEN_IN_PRODUCTION = [
  "dev/design-system",
  "DesignSystemCatalog",
  "Organismos",
  "Expediente 2026-118",
  "Contrato_4857",
  "Anexo_1_condiciones",
];
const FORBIDDEN_PATTERN = /design[ -]system/i;

let outDir = "";
let bundle = "";

function readBundle(directory: string): string {
  return readdirSync(directory, { recursive: true, encoding: "utf8" })
    .filter((file) => /\.(js|css|html)$/.test(file))
    .map((file) => readFileSync(join(directory, file), "utf8"))
    .join("\n");
}

describe("build de producción", () => {
  beforeAll(async () => {
    outDir = mkdtempSync(join(tmpdir(), "argus-build-"));
    // Vitest fija NODE_ENV=test, y con él Vite construiría en modo desarrollo.
    process.env.NODE_ENV = "production";
    await build({
      root: APP_ROOT,
      configFile: join(APP_ROOT, "vite.config.ts"),
      mode: "production",
      logLevel: "silent",
      build: { outDir, emptyOutDir: true },
    });
    bundle = readBundle(outDir);
  }, BUILD_TIMEOUT_MS);

  afterAll(() => {
    rmSync(outDir, { recursive: true, force: true });
  });

  it.each(FORBIDDEN_IN_PRODUCTION)("no contiene «%s»", (text) => {
    expect(bundle).not.toContain(text);
  });

  it("no menciona el design system en ningún texto", () => {
    expect(bundle).not.toMatch(FORBIDDEN_PATTERN);
  });

  it("sí contiene la interfaz real", () => {
    expect(bundle).toContain("ARGUS");
  });
});
