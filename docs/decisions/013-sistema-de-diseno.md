# 013 · Sistema de diseño: tokens, Atomic Design, i18n y temas

- **Estado:** aceptada · 15/10/2026
- **Contexto:** la Fase 5 construye la base visual según los mockups (`docs/mockups/ARGUS Design System.dc.html`). CLAUDE.md §9 exige tokens en 3 niveles, Atomic Design, todo texto en i18n, contraste ≥ 4.5:1 y ningún valor visual fuera de los tokens.
- **Decisión:**
  - **Tokens en CSS** (`src/design-tokens`): `global.css` con los valores crudos de los mockups, `semantic.css` con el propósito de cada valor en tema claro (`:root`) y oscuro (`[data-theme="dark"]`), `component.css` con tokens de componente que apuntan a los semánticos, y `motion.css` que anula las duraciones con `prefers-reduced-motion`.
  - **Contraste verificado por prueba:** `tokens.test.ts` lee los CSS, resuelve los `var()` y comprueba 20 pares de texto y fondo en ambos temas. También verifica que el oscuro redefina todos los colores del claro y que ninguna referencia quede sin definir. Los colores de los mockups pasan sin cambios.
  - **Lint de estilos:** stylelint rechaza colores hex, `rgb()`, píxeles, duraciones y tamaños, pesos y familias de fuente literales fuera de `design-tokens/`. Se probó con un archivo que viola cada regla.
  - **Atomic Design:** 11 átomos, 12 moléculas, 5 organismos (barra lateral expandida y contraída, barra superior con los estados del motor, lista de alertas, panel comparativo y zona de carga) y 3 templates. Cada componente usa CSS Modules que solo consumen tokens.
  - **Accesibilidad:** el riesgo y la decisión llevan icono y texto, además de color. «Ignorada» usa borde punteado y «Es un error» relleno. Los íconos son decorativos (`aria-hidden`). Los atajos son visibles y el modificador se adapta (Ctrl o ⌘).
  - **i18n:** `I18nProvider` con interpolación `{param}`, plurales con `Intl.PluralRules` y formatos regionales es-CO y en-US con `Intl`. Las claves de `en.json` se tipan con la forma de `es.json`.
  - **Temas:** `ThemeProvider` aplica `data-theme` en el documento con la preferencia claro, oscuro o según el sistema (vía `matchMedia`).
  - **Fuentes empaquetadas:** IBM Plex (`@fontsource`) y Material Symbols (`material-symbols`) se incluyen en el build. La app no descarga nada de internet.
  - **Complejidad en componentes:** el límite es 5 en lógica y 8 en archivos `.tsx`, porque cada `&&` y ternario del JSX suma complejidad. En pruebas no se limita.
- **Diferencias con los mockups:**
  - El mockup indica 5,9:1 para rojo sobre rosa; la fórmula WCAG da 5,65:1, que igual cumple.
  - `Intl` en es-CO produce «31%» sin el espacio del mockup («31 %»); depende de la versión de los datos regionales de cada WebView y se dejó como lo da `Intl`.
  - `Intl` usa 0 decimales para COP; se fijaron 2 para coincidir con el formato regional del mockup.
- **Consecuencias:** las pantallas de la Fase 6 se arman con estos componentes. La galería del design system (`pages/DesignSystemPage.tsx`) se reemplaza por las pantallas reales en la Fase 6.
