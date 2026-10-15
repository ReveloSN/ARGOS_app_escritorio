# 012 · Persistencia en SQLite y decisiones con deshacer

- **Estado:** aceptada · 15/10/2026
- **Contexto:** la Fase 4 guarda sesiones, alertas y decisiones para el historial y sus métricas (CLAUDE.md §10). Las decisiones se pueden deshacer y rehacer (Ctrl Z en el detalle de alerta).
- **Decisión:**
  - **Tres repositorios pequeños** (`SessionRepository`, `AlertRepository`, `DecisionRepository`) como puertos en `application/ports`, con adaptadores SQLite en `infrastructure/persistence`. Un puerto `Clock` hace deterministas las fechas en las pruebas.
  - **Esquema versionado:** `MIGRATIONS` es una tupla de scripts y `PRAGMA user_version` indica cuál fue el último aplicado. Una migración publicada no se edita; los cambios van en una nueva.
  - **Una conexión por operación:** FastAPI atiende peticiones en varios hilos y una conexión de sqlite3 no debe compartirse. Las claves foráneas están activas: una decisión sobre una alerta inexistente se rechaza con `AlertNotFoundError`.
  - **Alertas como JSON** con su origen completo (archivo, ubicación según el formato y fragmento), más columnas de tipo y riesgo para consultar sin deserializar.
  - **Fechas en UTC** con microsegundos fijos, para que se ordenen bien como texto. El dominio rechaza fechas sin zona horaria.
  - **Command:** `RecordDecisionCommand` recuerda la decisión anterior de la alerta. Deshacer la restaura exactamente, o deja la alerta pendiente si era la primera. `CommandHistory` mantiene las pilas de deshacer y rehacer, y un comando nuevo descarta lo rehacible. El historial vive mientras la revisión está abierta; en la base de datos queda la decisión vigente.
  - **Métricas:** alertas resueltas (incluye «Ignorar»), tiempo medio desde cargar hasta cerrar (solo sesiones cerradas) y porcentaje de «Es un error» sobre las resueltas. Una tasa sin datos es «desconocida», no 0 %.
  - **Ubicación del archivo:** la carpeta de datos de la app de cada sistema operativo, vía `platformdirs` (dependencia nueva, pequeña y multiplataforma). La carpeta configurable de Ajustes > Privacidad se conecta en la Fase 6.
- **Consecuencias:** la retención de 90 días que muestran los ajustes y la exportación a CSV del historial quedan para la Fase 6, sobre estos mismos repositorios.
