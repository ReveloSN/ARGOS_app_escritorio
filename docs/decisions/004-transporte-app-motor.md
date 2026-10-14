# 004 · Comunicación app ↔ motor: HTTP local con token y progreso por SSE

- **Estado:** aceptada · 14/10/2026 (se implementa en la Fase 0c)
- **Contexto:** el motor es un sidecar local. Cualquier proceso del equipo podría llamar a un puerto abierto en `127.0.0.1`. El progreso de lectura y análisis (Observer) fluye solo del motor hacia la interfaz.
- **Decisión:** Tauri lanza el motor en `127.0.0.1` con un puerto libre y un **token aleatorio por ejecución**, que viaja en cada petición. El progreso se transmite con **Server-Sent Events**. En la interfaz, `services/` es el único punto de acceso HTTP.
- **Consecuencias:** otros procesos locales no pueden usar el motor. SSE es más simple que WebSocket para un flujo unidireccional y no requiere dependencias extra.
