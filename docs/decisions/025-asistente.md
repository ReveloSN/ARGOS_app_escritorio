# 025 · Asistente de IA: estados del motor, primeros pasos y ajustes (Fase 7)

- **Estado:** aceptada · 23/10/2026
- **Contexto:** los mockups «ARGUS Identidad», «ARGUS Ojo», «ARGUS Sidebar», «ARGUS Topbar» e «ARGUS Inicio» definen el asistente como el mismo ojo del logo, sin rostro ni nombre propio, con siete estados (dormido, atento, éxito, duda, alerta alta, explicando y error), un onboarding de tres pasos y la sección Ajustes › Asistente. CLAUDE.md §14 exige que su estado salga de datos reales del motor y de la revisión, nunca simulados.
- **Decisión:**
  - **Estado derivado, no guardado.** `assistantStatus` es una función pura de las señales reales: estado del motor, avance de lectura, panel «Explicar este cambio» abierto, archivos ilegibles, alertas altas pendientes y pares «Sin confirmar» del expediente. El orden decide cuál se muestra, de lo inmediato a lo acumulado:

    | Situación | Ojo | Texto en la barra lateral |
    |---|---|---|
    | Motor detenido | dormido | En pausa (arriba: «Asistente de IA detenido · Reintentar») |
    | Motor iniciando | dormido | Iniciando |
    | Leyendo archivos | atento | Leyendo N de M archivos |
    | Panel «Explicar este cambio» abierto | explicando | Explicando un cambio |
    | Expediente con archivos ilegibles | error | No pudo leer un archivo |
    | Alertas altas sin decidir | alerta alta | N alertas de riesgo alto |
    | Pares «Sin confirmar» en Datos confirmados | duda | Necesita una confirmación |
    | Expediente sin alertas | éxito | Sin inconsistencias |
    | Sin expediente o con alertas medias o bajas | atento | Listo |

  - **Decidido con el usuario:**
    - El estado va en la barra lateral, con el ojo y el texto, y también en la barra superior, con el mismo vocabulario. Reemplaza al antiguo indicador «Motor de análisis listo/detenido».
    - Sin expediente y con el motor funcionando, el asistente está «atento · Listo», como en el mockup de Inicio. «Dormido · En pausa» queda para el motor detenido o iniciando.
    - «Duda» sale de los pares «Sin confirmar» que ya calcula el motor. Al abrir un expediente se consultan, y cada cambio en Datos confirmados actualiza la cuenta.
    - Los primeros pasos se abren solos la primera vez, y Ajustes › Asistente añade «Ver primeros pasos», que no está en el mockup.
  - **Ajustes de la interfaz, no del motor:** «Mostrar asistente», «Reducir movimiento» y «primeros pasos vistos» se recuerdan en el almacenamiento local, igual que el idioma y el tema. Si no hay almacenamiento, los primeros pasos no se abren solos, para no aparecer en cada arranque.
  - **Accesibilidad:** el estado es un `role="status"` con la etiqueta «Asistente de IA: …». Ocultar el asistente quita el ojo (también el de los paneles, mediante `AssistantEye`), pero no el texto. El logo nunca se oculta. Contraída, la barra lateral deja solo el ojo con su etiqueta.
  - **Movimiento:** un parpadeo de 200 ms (`--duration-base`) cada vez que cambia el estado, sin animaciones continuas. «Reducir movimiento» pone `data-motion="reduced"` en el documento y lleva las duraciones a 0, igual que `prefers-reduced-motion`.
  - **Inicio** muestra el ojo grande sobre la retícula (`ReticleMotif`), con la etiqueta del estado real, como en el mockup.
- **Consecuencias:**
  - Se eliminan `EngineStatusIndicator` y `useEngineStatusView`, y `AssistantStatusIndicator` los reemplaza.
  - El estado no se persiste: se recalcula en cada render a partir de los datos.
  - Cuando el motor no responde a la consulta de datos confirmados, no se muestra una duda que no consta.
