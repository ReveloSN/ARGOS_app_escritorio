# ARGUS — Reglas permanentes del proyecto

Lee este archivo completo antes de escribir código. Si una tarea contradice estas reglas, avisa antes de continuar.

## 1. Qué es ARGUS
App de escritorio (Windows y Linux) que compara documentos, correos y archivos relacionados, detecta inconsistencias antes de que el usuario finalice una tarea y muestra una alerta con los datos involucrados para que decida. Ejemplos guía: "Contrato No. 4857" vs "4587"; correo que dice "informe de junio" con adjunto de mayo.

Principio central: **la detección no depende de IA generativa ni de internet.** La IA generativa solo explica alertas y es opcional.

## 2. Stack
- Interfaz: Tauri 2 + React + TypeScript (strict).
- Motor de análisis: Python 3.11+ como sidecar local (FastAPI), empaquetado con PyInstaller.
- Persistencia: SQLite.
- NLP/IA local: spaCy (`es_core_news_md`), rapidfuzz, sentence-transformers (`paraphrase-multilingual-MiniLM`).
- Tests: pytest (motor), Vitest + Testing Library (interfaz).

## 3. Arquitectura
Arquitectura hexagonal (puertos y adaptadores) en el motor; la dependencia siempre apunta hacia el dominio.

```
engine/
  argus/
    domain/          # entidades, value objects, reglas. Cero imports de frameworks.
    application/     # casos de uso y puertos (interfaces). Orquesta el dominio.
    infrastructure/  # adaptadores: lectores de archivos, SQLite, NLP, IA, FastAPI.
    api/             # rutas HTTP, esquemas de entrada/salida, inyección de dependencias.
  tests/
app/                 # Tauri + React
  src/
    design-tokens/   # tokens globales, semánticos y de componente
    components/
      atoms/ molecules/ organisms/ templates/
    pages/           # instancias con datos reales
    features/        # review, alerts, history, settings (cada una con su lógica)
    services/        # cliente del motor (un solo punto de acceso HTTP)
    i18n/            # es.json, en.json
docs/mockups/        # mockups de referencia
```

Reglas de capas: `domain` no importa de `application` ni `infrastructure`. `application` solo depende de `domain` y de sus propios puertos. Los adaptadores implementan puertos. Las dependencias se inyectan por constructor; nada de singletons globales ni imports directos de adaptadores dentro de casos de uso.

## 4. Código limpio
- **SOLID.** S: una razón de cambio por clase. O: extender por nuevas clases, no editando `if/else`. L: toda subclase sustituye a su base. I: puertos pequeños y específicos. D: depender de abstracciones (`Protocol`/`ABC` en Python, `interface` en TypeScript).
- **DRY.** Si algo se repite dos veces, se extrae a una función o clase reutilizable. Antes de crear algo nuevo, busca si ya existe.
- **Tamaño.** Clases de máximo ~150 líneas, funciones de máximo ~20 líneas, máximo 3 parámetros (si hay más, usar un objeto de parámetros), máximo 2 niveles de anidación. Archivos de componente React de máximo ~150 líneas.
- **Nombres.** Una clase es un sustantivo que dice lo que hace: `ContractIdExtractor`, `DamerauLevenshteinComparator`, `RiskClassifier`. Una función es un verbo: `extract_entities`, `classify_risk`. Prohibido `Manager`, `Helper`, `Utils`, `Data`, `Processor` genérico. Booleanos con `is_/has_/can_`. Nada de abreviaturas crípticas. Código en inglés; textos de la interfaz en español vía i18n.
- **Una clase hace lo que su nombre promete.** Si el nombre no describe todo lo que hace, o se divide o se renombra.
- Sin números ni textos mágicos: constantes con nombre o configuración.
- Comentarios solo para explicar el porqué, nunca el qué.
- Errores con excepciones del dominio (`UnreadableDocumentError`), nunca `except Exception: pass`.
- Tipado estático completo: type hints + mypy strict en Python, TypeScript strict sin `any`.
- Inmutabilidad por defecto: `@dataclass(frozen=True)` y `readonly` en TypeScript.
- Formato y lint obligatorios: ruff + black + mypy; eslint + prettier.

## 5. Patrones de diseño (usarlos donde resuelven un problema real, no por adorno)
| Patrón | Dónde |
|---|---|
| Factory | `DocumentReaderFactory`: elige el lector según extensión (PDF, DOCX, XLSX, EML, texto) |
| Strategy | `Comparator`: Damerau-Levenshtein, fechas, montos, semántico; intercambiables |
| Pipeline / Chain of Responsibility | Cadena de extractores de entidades y cadena de reglas de riesgo |
| Specification | Reglas de riesgo componibles (`AmountMismatch`, `ContractIdTransposition`) |
| Repository | Acceso a SQLite detrás de puertos (`AlertRepository`, `SessionRepository`) |
| Adapter | Proveedores de IA detrás del puerto `AlertExplainer` |
| Observer | Progreso de lectura y análisis hacia la interfaz |
| Command | Decisiones del usuario (`Es correcto / Es un error / Ignorar`) con deshacer |
| Dependency Injection | Contenedor simple de composición en `api/` |

## 6. Estructuras de datos (elegir con criterio y documentar por qué)
- Índice invertido `dict[entity_type][normalized_value] -> list[Occurrence]` para cruzar entidades entre documentos en O(1).
- `set` para deduplicar y comparar valores.
- Cola de prioridad (`heapq`) para ordenar alertas por riesgo y confianza.
- BK-tree sobre distancia Damerau-Levenshtein para buscar identificadores casi iguales sin comparar todos contra todos.
- `tuple`/dataclass inmutable para value objects (`Money`, `ContractId`, `Period`).
- Evitar listas anidadas y diccionarios sin tipo como modelo de dominio.

## 7. Dominio central
Entidades: `Document`, `Entity` (tipo, valor crudo, valor normalizado, `Occurrence` con archivo y página), `Alert` (par de ocurrencias, tipo, `RiskLevel`, confianza, explicación), `ReviewSession`, `Decision`.
Niveles de riesgo: ALTO (montos, identificadores, fechas contractuales), MEDIO (nombres), BAJO (formato).
Toda alerta debe poder rastrearse al archivo, página y fragmento de origen de **cada** valor. Nunca mostrar un valor sin su origen.

## 8. Inteligencia artificial
Capas, de más a menos determinista. Cada una detrás de un puerto y reemplazable:
1. Reglas y distancia de edición (determinista).
2. Extracción de entidades: regex + spaCy NER.
3. Comparación semántica: embeddings multilingües offline (detecta "informe de junio" vs periodo del adjunto).
4. Detección de anomalías: valores numéricos o fechas fuera de patrón dentro de un mismo conjunto de documentos.
5. Clasificación de riesgo: reglas primero; modelo entrenable después, con las decisiones del usuario como retroalimentación.
6. Explicación en lenguaje natural (opcional, puerto `AlertExplainer`): proveedor LLM configurable con respaldo por plantillas. Si no hay internet o clave, la app funciona igual.
Privacidad: el análisis es local por defecto. Nada sale del equipo sin consentimiento explícito en Ajustes. Claves de API en el llavero del sistema operativo, nunca en archivos ni en el repo.
Toda salida de IA se muestra como sugerencia con su confianza; la decisión siempre es del usuario.

## 9. Interfaz (criterios del curso de Diseño de Interfaces)
**Orden de trabajo: contenido → jerarquía → estructura → estilo.** Prohibido lorem ipsum.
- **Arquitectura de información:** organización (sesión → archivos → alertas → decisiones), etiquetado con vocabulario único, navegación y búsqueda con filtros combinables (faceted).
- **Navegación global:** barra lateral colapsable + barra superior. **Contextual:** breadcrumbs, tabs internos, acciones inline. Sin bottom nav.
- **Atomic Design:** átomos, moléculas, organismos, templates, páginas, en carpetas separadas.
- **Design tokens en 3 niveles:** globales (`color.neutral.900`, `spacing.4`), semánticos (`color.risk.high`, `color.background.primary`), de componente (`alert.row.high.border`). Los componentes solo consumen tokens, nunca valores literales. Salida en CSS variables.
- **Voz estable y tono variable:** sobria, precisa, respetuosa, tipo auditor. Sin marketing ni exclamaciones.
- **Lenguaje del usuario, no del sistema.** Ejemplo: "No pudimos leer el archivo", no "Excepción de parseo".
- **Anatomía del mensaje de error, 3 partes obligatorias:** qué pasó (en lenguaje del usuario), por qué (solo si ayuda a actuar), qué hacer ahora (acción concreta con botón). Nunca exponer códigos internos sin traducir.
- **Internacionalización:** textos solo en `i18n/*.json`; ningún botón con ancho exacto de su texto; barra lateral y tabs con truncamiento o salto de línea; fechas y montos según configuración regional.
- **Accesibilidad:** el riesgo nunca se comunica solo con color (añadir etiqueta o icono); contraste mínimo 4.5:1; todo operable con teclado y con atajos visibles.
- **Feedback:** progreso por archivo, confirmación al decidir, deshacer. Animaciones de 150–250 ms, funcionales.
- **Estilo:** herramienta de trabajo sobria; un solo color de acento; fuente monoespaciada para identificadores, montos y fechas. Evitar degradados morados, glassmorphism, sombras difusas, tarjetas idénticas con iconos en círculos y emojis como iconos.
- Los mockups de `docs/mockups/` son la fuente de verdad visual. Si algo no está en ellos, pregunta antes de inventar.
- Los datos de ejemplo y el catálogo de componentes son solo para desarrollo; la interfaz de producción solo muestra datos reales del motor.

## 10. Métricas de usabilidad que el producto debe poder cumplir
Eficacia (tasa de éxito de la tarea), eficiencia (tiempo en tarea y tasa de error), satisfacción (SUS ≥ 68). El historial muestra: alertas resueltas, tiempo medio de revisión y porcentaje de alertas marcadas como error real.

## 11. Pruebas y calidad
- Cada caso de uso y cada comparador con pruebas unitarias. Caso obligatorio: 4857 vs 4587 debe generar una alerta ALTA.
- Dominio y aplicación con ≥ 85% de cobertura. Adaptadores con pruebas de integración y archivos de ejemplo en `tests/fixtures/`.
- Pruebas de componentes de interfaz para átomos y organismos.
- Nada se da por terminado si no pasan lint, tipos y pruebas.

## 12. Multiplataforma
Rutas con `pathlib`, nunca con separadores a mano. Sin dependencias exclusivas de un sistema operativo. CI con matriz `ubuntu-latest` y `windows-latest`. Instaladores: `.msi` (Windows), `.deb` y `.AppImage` (Linux).

## 13. Forma de trabajar
- Cambios pequeños, un commit por unidad lógica, mensajes en formato Conventional Commits.
- Antes de crear una clase o componente, busca si ya existe uno reutilizable.
- No agregues dependencias sin justificarlas.
- Al terminar una tarea, di en 2-3 líneas qué quedó hecho y qué falta.
- Si hay una decisión de arquitectura nueva, regístrala en `docs/decisions/NNN-titulo.md` (ADR corto)

## 14. Funciones de la v0.1 (ampliación)
- **Comparar versiones** palabra por palabra: texto que falta, agregado, cambiado (A → B) y movido.
- **Inconsistencias entre documentos:** la detección por entidades de las secciones 1 y 7.
- **Matriz** para comparar 3 o más documentos entre sí.
- **Expediente:** datos confirmados por el usuario como fuente de verdad; lo que los contradiga se marca y las falsas alarmas ignoradas se recuerdan.
- **Revisión antes de enviar:** un correo y sus adjuntos antes de mandarlos.
- **Informe exportable** en PDF y DOCX.
- **Asistente de IA (mascota):** su estado sale de datos reales del motor y de la revisión, nunca simulados.

## 15. Decisión de IA para la v0.1
- Embeddings: MiniLM multilingüe local (por defecto).
- Entidades: spaCy.
- `ChangeExplainer` opcional: un LLM con su clave en el llavero del sistema operativo. Solo recibe los fragmentos alineados, tiene respaldo por plantillas y su salida siempre va rotulada «Sugerencia de IA», con la cita de su origen.
- `OcrEngine`: Tesseract local por defecto. Google Document AI es opcional y viene apagado: pide consentimiento explícito, dice cuántas páginas saldrán del equipo y guarda las credenciales en el llavero.
- Puertos listos, sin implementar todavía, para un embedder Nemotron local y un clasificador NLI.

## 16. Reglas añadidas
- La detección exacta nunca depende de IA, de internet ni de claves. La IA solo alinea, clasifica y explica.
- El catálogo de componentes y los datos de ejemplo son solo para desarrollo; la interfaz de producción solo muestra datos reales del motor.
- Ningún texto de producto menciona «átomos», «moléculas» ni «organismos».
