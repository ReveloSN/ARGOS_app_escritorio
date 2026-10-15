# 008 · Arranque del motor desde Tauri

- **Estado:** aceptada · 14/10/2026
- **Contexto:** el ADR 004 fija el transporte (HTTP local, token por ejecución, SSE). Falta definir cómo Tauri lanza el motor, cómo conoce su puerto, cómo evita dejarlo huérfano y qué ve la interfaz mientras tanto.
- **Decisión:**
  - **Puerto:** el motor abre su socket en `127.0.0.1:0`, empieza a escuchar y anuncia el puerto real con una línea JSON en stdout (`{"event": "ready", "port": N}`). Así no hay carrera entre elegir un puerto y ocuparlo.
  - **Token:** Tauri lo genera con `getrandom` (32 bytes) y lo pasa por la variable de entorno `ARGUS_ENGINE_TOKEN`, no por argumentos, que serían visibles en la lista de procesos. El motor rechaza con 401 cualquier petición sin `Authorization: Bearer <token>`.
  - **CORS:** solo se permiten los orígenes de la WebView (`http://tauri.localhost`, `tauri://localhost`) y el servidor de Vite (`http://localhost:1420`). El middleware de CORS va por fuera del de token para que la interfaz pueda leer los 401.
  - **Fin del proceso:** con `--exit-on-stdin-close` el motor termina cuando se cierra su stdin. Tauri lo cierra al salir, y el sistema operativo lo cierra si la app falla, así que no quedan procesos huérfanos aunque `uv` no reenvíe señales.
  - **Desarrollo y release:** por ahora Tauri ejecuta `uv run --project ../../engine python -m argus`. En la Fase 8 el sidecar de PyInstaller reemplaza ese comando sin cambiar el protocolo.
  - **Interfaz:** `EngineClient` es el único punto HTTP. `EngineStatusMonitor` (Observer) consulta `/health` cada 2 s mientras haya suscriptores y publica `starting`, `ready` o `stopped`. Fuera de Tauri, la conexión sale de `VITE_ENGINE_URL` y `VITE_ENGINE_TOKEN` (ver `app/.env.example`).
- **Consecuencias:** el código Rust solo se compila en CI hasta que haya Rust en la máquina de desarrollo. El texto «Iniciando motor de análisis» no está en los mockups (la barra superior solo define listo, analizando y detenido) y queda pendiente de validar en la Fase 5.
