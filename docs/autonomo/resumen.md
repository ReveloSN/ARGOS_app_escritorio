# Resumen del trabajo autónomo (rama local `trabajo-autonomo`, sin push)

Se detuvo a las 01:17 del 26/10 a pedido del usuario; se retoma al día siguiente.

## Errores corregidos (con prueba cuando es posible)
- `test_engine_process_serves_health…`: era el arranque en frío (importar `anthropic` ≈12 s y `spacy` ≈6 s); límite 30 → 120 s.
- Historial a 800 px: la columna «Sesión» quedaba con ancho 0.
- Lista de alertas: títulos, archivos y valores cortados sin forma de leerlos (ahora el título se ajusta y el resto lleva `title`).
- Comparar › Documentos del expediente: las casillas se pegaban al nombre anterior.
- Comparar versiones: el texto de los documentos se recortaba por la derecha.
- Interruptores y casillas con área de clic de 20 px (ahora ≥ 26 px).
- Inicio decía «Todavía no hay revisiones» con revisiones guardadas en el Historial.
- Nuevo: variable `ARGUS_DEV_ORIGIN` (solo bucle local) para un segundo servidor de desarrollo, con pruebas.

## Usabilidad (capturas en `docs/autonomo/capturas/`)
- B1: la barra superior ya no repite el estado del asistente («3 alertas de riesgo alto»).
- B2: Inicio con revisiones guardadas ofrece «Ver el historial».

## Pendiente
- B3 «Opciones» plegable en Comparar (filtros, «Solo cambios importantes», leyenda): pruebas escritas en `git stash` («B3 Opciones…»), sin implementar. El minimapa no se movió.
- Resto del Ciclo B: «Nueva revisión» repetido, etiquetas y mensajes de 3 partes, números 1/2/3 de las pestañas que parecen conteos, filas altas de alertas a 800 px, recorrido solo con teclado, ventana pequeña en Comparar, renombrar/eliminar sesión, Revisar antes de enviar. `docs/progreso.md` sin actualizar.

## Incidente
Mis dos pruebas de API entraron en el historial real del usuario (sesiones `904d1ad7bb274d478d582d21482cd010` y `2bfdf98326b74af9ad776fdc41c18768`); no las borré.

## No verificado
App empaquetada de Tauri; IA con clave real; resultado visual de comparación en el panel (capturas recortadas por el viewport emulado).
