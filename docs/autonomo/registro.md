# Registro de trabajo autónomo

Rama local `trabajo-autonomo` (sin push; GitHub no es necesario). Zona horaria: America/Bogota. Límite: 23:00 (no empezar nada nuevo desde las 22:45).

## Ciclo 0 · 13:15
- Encontré: repositorio en `ARGOS_app_escritorio/`, rama `main` limpia salvo `graphify-out/` sin seguimiento.
- Cambié: creé la rama `trabajo-autonomo` y este registro.
- Línea base de pruebas del motor (`uv run pytest`) y de la interfaz (lint, tipos) en curso; la prueba `test_engine_process_serves_health_and_exits_when_stdin_closes` arranca el motor real con un tiempo de espera de 30 s.
- Sin verificar: aún nada.

## Ciclo A · 13:50 · prueba de arranque del motor
- Encontré: línea base del motor 1686 pasan; lint y tipos de la interfaz en verde. `test_engine_process_serves_health…` tardó 25 s de 30 s. Causa medida con `-X importtime`: el arranque en frío importa `anthropic` (≈12 s) y `spacy` (≈6 s). No es un fallo, es el límite.
- Cambié: `STARTUP_TIMEOUT_SECONDS` 30 → 120 con comentario del porqué. La prueba corre y pasa (8/8 del archivo).
- Pendiente (no hecho): importar `anthropic` solo al usarlo reduciría el arranque real; no lo hice porque es un cambio de comportamiento, no un error.
- Sin verificar: tiempos en el equipo sin Defender/caché fría.
