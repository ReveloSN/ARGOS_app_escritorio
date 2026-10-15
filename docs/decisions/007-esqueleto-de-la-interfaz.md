# 007 · Esqueleto de la interfaz: Tauri 2, CSP restrictiva y reglas de lint para i18n

- **Estado:** aceptada · 14/10/2026
- **Contexto:** la Fase 0b crea la app de escritorio. La máquina de desarrollo todavía no tiene Rust, y CLAUDE.md exige que ningún texto de interfaz quede fuera de i18n.
- **Decisión:**
  - Ventana de 1280 × 800 con mínimo de 1100 × 700, como en los mockups. Identificador `com.argus.desktop`, que se puede cambiar antes de publicar el primer instalador.
  - CSP sin orígenes externos: solo `'self'`, el IPC de Tauri y `http://127.0.0.1:*` para el motor local (ADR 004). Las fuentes se empaquetarán localmente en la Fase 5.
  - ESLint rechaza texto con letras en JSX (texto, literales y atributos `title`, `alt`, `placeholder`, `aria-label`). También aplica los límites de CLAUDE.md §4: 3 parámetros, 2 niveles de anidación, complejidad 5, 20 líneas por función y 150 por archivo.
  - Los catálogos `es.json` y `en.json` se tipan con la forma del español, y una prueba verifica que tengan las mismas claves.
  - El CI compila Rust con `tauri build --no-bundle` y pasa `cargo fmt` y `clippy -D warnings` en ubuntu y windows. Los instaladores quedan para la Fase 8.
- **Consecuencias:** la compilación de escritorio se verifica en CI aunque falte Rust en local. `Cargo.lock` se agregará al repo con la primera compilación local, para fijar versiones.
