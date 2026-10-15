import { defineConfig } from "vitest/config";

// El build de producción se verifica aparte: compilar compite por CPU con el resto de pruebas.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.bundle.test.ts"],
  },
});
