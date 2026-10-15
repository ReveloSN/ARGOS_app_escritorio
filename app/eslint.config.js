import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

// Límites de CLAUDE.md §4.
const MAX_FUNCTION_LINES = 20;
const MAX_FILE_LINES = 150;
const MAX_PARAMS = 3;
const MAX_NESTING = 2;
const MAX_COMPLEXITY = 5;
const MAX_COMPONENT_COMPLEXITY = 8;

const LETTER = "[A-Za-zÀ-ÿ]";
const I18N_MESSAGE = "Los textos de interfaz van en src/i18n/*.json (CLAUDE.md §9).";
const TRANSLATABLE_ATTRIBUTES = "^(title|alt|placeholder|aria-label|aria-description)$";

const sizeOptions = { skipBlankLines: true, skipComments: true };

export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules", "src-tauri"] },
  {
    files: ["**/*.js"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["error", { allowConstantExport: true }],
      "max-params": ["error", MAX_PARAMS],
      "max-depth": ["error", MAX_NESTING],
      complexity: ["error", MAX_COMPLEXITY],
      "max-lines": ["error", { max: MAX_FILE_LINES, ...sizeOptions }],
      "max-lines-per-function": ["error", { max: MAX_FUNCTION_LINES, ...sizeOptions }],
      "no-restricted-syntax": [
        "error",
        { selector: `JSXText[value=/${LETTER}/]`, message: I18N_MESSAGE },
        { selector: `JSXExpressionContainer > Literal[value=/${LETTER}/]`, message: I18N_MESSAGE },
        {
          selector: `JSXAttribute[name.name=/${TRANSLATABLE_ATTRIBUTES}/] > Literal`,
          message: I18N_MESSAGE,
        },
      ],
    },
  },
  {
    // En componentes el límite que aplica es el del archivo: el JSX no se mide por función.
    files: ["**/*.tsx"],
    // Cada `&&` y ternario del JSX suma complejidad; en componentes se admite un poco más.
    rules: { "max-lines-per-function": "off", complexity: ["error", MAX_COMPONENT_COMPLEXITY] },
  },
  {
    // Los bloques describe/it agrupan casos; su tamaño no refleja responsabilidades. Los textos
    // de las pruebas son datos de ejemplo, no interfaz: la regla de i18n no aplica.
    files: ["**/*.test.{ts,tsx}"],
    rules: { "max-lines-per-function": "off", "no-restricted-syntax": "off", complexity: "off" },
  },
  {
    // Catálogo de componentes solo para desarrollo: no es interfaz de producción ni se empaqueta.
    files: ["src/dev/**/*.{ts,tsx}"],
    rules: { "no-restricted-syntax": "off" },
  },
  prettier,
);
