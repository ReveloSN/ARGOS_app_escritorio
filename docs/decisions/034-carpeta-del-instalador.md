# 034 · El programa no comparte carpeta con el historial

- **Estado:** aceptada · 22/11/2026
- **Contexto:** el instalador NSIS de Tauri instala por usuario en `%LOCALAPPDATA%\<productName>`, es decir `%LOCALAPPDATA%\ARGUS`, la misma carpeta donde el motor guarda el historial (`platformdirs`, ADR 017). El desinstalador solo borra lo que instaló, pero quien borrara esa carpeta a mano para reinstalar perdía sus revisiones.
- **Decisión:**
  - El programa va a `%LOCALAPPDATA%\Programs\ARGUS` y el historial se queda donde está. No se migran datos: mover el programa es reversible, mover el historial no.
  - Se usan los ganchos de Tauri (`app/src-tauri/windows/installer-hooks.nsh`) y no una copia de su plantilla, para no mantener mil líneas ajenas.
  - Si la carpeta de destino es la del historial, por defecto, por una instalación anterior o elegida a mano, se cambia a la del programa. Cualquier otra carpeta elegida se respeta.
  - Al actualizar desde la 0.1.2 o anterior, el desinstalador de esa versión quita el programa viejo con `/UPDATE` y los accesos directos se redirigen. Ningún gancho borra carpetas con su contenido.
  - `engine/distribution/test_windows_installer.ps1` lo comprueba en el workflow «Instaladores»: instalación nueva, actualización desde la 0.1.1 y la 0.1.2 (también con la app abierta y en modo actualización), carpeta elegida y desinstalación. Si falla, no se publica.
- **Alternativas descartadas:**
  - Mover el historial a otra carpeta: pone en riesgo los datos de todos los equipos.
  - Cambiar `productName`: cambia el nombre visible, los accesos directos y las claves de desinstalación.
- **Consecuencias:**
  - El `.msi` (Archivos de programa), Linux y macOS ya separaban programa y datos y no cambian. El zip portable se ejecuta desde donde se descomprima.
  - En equipos que no actualicen a la 0.1.3 las carpetas siguen compartidas.
