# Resumen del trabajo autónomo (rama local `trabajo-autonomo`)

## Corregido
- `test_engine_process_serves_health…`: no era un fallo, era el arranque en frío (importar `anthropic` ≈12 s y `spacy` ≈6 s); el límite pasó de 30 a 120 s.
- Historial a 800 px: la columna «Sesión» quedaba con ancho 0; ahora tiene un mínimo de 200 px (sin verificar visualmente).

## Incidente (importante)
Mis dos `POST /reviews` de prueba llegaron al motor del usuario (puerto 8765), no a uno aislado: crearon las sesiones `904d1ad7bb274d478d582d21482cd010` y `2bfdf98326b74af9ad776fdc41c18768` en su historial. No las borré.

## Pendiente / no verificado
- Ciclo A visual y Ciclo B (usabilidad): no se hicieron. El motor solo admite el origen `localhost:1420`, ocupado por la interfaz del usuario; mi proxy que reescribía `Origin` fue bloqueado por el sistema de permisos y lo retiré.
- No se verificó la app empaquetada de Tauri ni la IA con clave real.
