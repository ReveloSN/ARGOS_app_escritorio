# Inicio de sesión Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una cuenta opcional con Supabase Auth como puerta de entrada de ARGUS.

**Architecture:** El motor habla con Supabase detrás del puerto `IdentityProvider` y guarda la sesión en el llavero. La interfaz solo consume `/account/*` del motor local. Sin configuración, la función no existe para el usuario.

**Tech Stack:** Python 3.12, FastAPI, requests, keyring; React 19, TypeScript strict, Vitest.

**Spec:** docs/superpowers/specs/2026-11-21-inicio-de-sesion-design.md

## Global Constraints

- CLAUDE.md completo rige: funciones de 20 líneas o menos, 3 parámetros o menos, archivos de 150 líneas o menos, mypy strict, sin `any`, capas hexagonales.
- Ninguna dependencia nueva. La CSP de Tauri no cambia.
- Finales de línea LF en todo archivo.
- Pruebas del motor con `uv run --no-sync`. Ninguna prueba toca el llavero real, internet ni un Supabase real.
- Contraseña, código y tokens: nunca en registros, SQLite, archivos, `localStorage` ni respuestas del motor.
- Textos solo en `es.json` y `en.json`, de usted. Tokens de diseño, sin valores literales.
- No tocar `.impeccable/` ni `graphify-out/`. Nada de push, merge ni etiquetas. Cada commit lleva solo los archivos de su tarea.

## Review Focus

1. Abrir sin internet o con el proyecto pausado (5xx, timeout, HTML en vez de JSON): sigue `signed_in` con `isOffline: true` y la sesión no se borra. (Tareas 1 y 2)
2. Dos renovaciones a la vez, o cerrar sesión durante una: una sola rotación, y la sesión cerrada no revive. (Tarea 1)
3. La contraseña nueva es débil cuando el código ya se gastó: se reintenta con otra sin pedir otro código. (Tarea 1)
4. Una respuesta lenta llega tras cerrar el diálogo o cambiar de vista: no pisa el estado más nuevo. (Tarea 3)
5. Sesión larga en el Administrador de credenciales de Windows (1280 caracteres por entrada): se guarda completa. (Tarea 2)

## Contrato HTTP

Lo produce la tarea 2 y lo consume la 3. Todo con el token interno y en camelCase.

```ts
interface AccountState {
  status: "unavailable" | "signed_out" | "signed_in" | "expired";
  account: { id: string; email: string; displayName: string | null } | null;
  email: string | null; // para rellenar el formulario si expired
  gateSkipped: boolean;
  isOffline: boolean;
  isPersisted: boolean; // false: sin llavero, dura mientras la app esté abierta
}
```

| Ruta | Cuerpo | Respuesta |
|---|---|---|
| GET /account | ninguno | AccountState, sin usar la red |
| POST /account/refresh | ninguno | AccountState |
| POST /account/sign-up | email, password, displayName opcional | `{state: AccountState, needsConfirmation: boolean}` |
| POST /account/verify | email, code | AccountState |
| POST /account/sign-in | email, password | AccountState |
| POST /account/sign-out | ninguno | AccountState, también sin red |
| POST /account/skip | ninguno | AccountState |
| POST /account/password-reset | email | 204 |
| POST /account/password-reset/confirm | email, code, password | AccountState, con sesión |

Los errores responden `{detail: code}`: `invalid_credentials` 401, `email_not_confirmed` 403, `invalid_code` 422, `email_taken` 409, `weak_password` 422, `rate_limited` 429, `email_unavailable` 503, `offline` 503, `keychain_unavailable` 503, `account_unavailable` 409.

---

### Task 1: Dominio y casos de uso de la cuenta

Dificultad alta: concurrencia y seguridad.

**Files:**
- Create: `engine/argus/domain/account.py`, `engine/argus/application/ports/identity_provider.py`, `engine/argus/application/ports/account_storage.py`, `engine/argus/application/account/` (`__init__`, `account_sessions`, `sign_up`, `sign_in`, `sign_out`, `password_reset`)
- Modify: `engine/argus/domain/errors.py`
- Test: `engine/tests/application/account_doubles.py`, `engine/tests/application/test_account.py`

**Interfaces — Produces:**
- `Account(id, email, display_name: str | None)`.
- `AccountSession(account, access_token, refresh_token)`, con los tokens `repr=False`.
- `StoredSession(account, refresh_token: str | None)`: `None` significa vencida.
- `Credentials(email, password)`, con `password` `repr=False`.
- `AccountState(status, account, email, gate_skipped, is_offline, is_persisted)`.
- `AccountError(ArgusDomainError)` con `problem: AccountProblem`, un StrEnum con `invalid_credentials`, `email_not_confirmed`, `invalid_code`, `email_taken`, `weak_password`, `rate_limited`, `email_unavailable`, `offline`, `account_unavailable` y `session_revoked` (interno). El llavero sigue usando `KeychainUnavailableError`.
- `IdentityProvider`: `sign_up(credentials, display_name) -> AccountSession | None` (None = falta confirmar); `sign_in(credentials)`, `verify_signup(email, code)`, `verify_recovery(email, code)` y `refresh(refresh_token)`, que devuelven `AccountSession`; `sign_out(access_token)`; `request_password_reset(email)`; `update_password(access_token, password)`.
- `SessionStore`: `read() -> StoredSession | None`, `write(session)`, `clear()`.
- `GatePreference`: `is_skipped()`, `set_skipped(value)`.
- `AccountSessions(provider | None, store, gate)`: `current()`, `refresh()`, `skip()`; dueño del candado y del respaldo en memoria.
- Casos de uso sobre `AccountSessions`: `SignUp` (execute, verify), `SignIn`, `SignOut`, `PasswordReset` (request, confirm).

**Steps:**
- [ ] Escribir estas pruebas y verlas fallar:
  - sin proveedor: `unavailable`, y las operaciones lanzan `account_unavailable`
  - `current()` no llama al proveedor
  - alta con sesión: entra; alta sin sesión: pide confirmar y no guarda; verificar: entra
  - el correo se recorta y pasa a minúsculas; la contraseña no se toca
  - renovar rota el token guardado; `offline` conserva la sesión con `is_offline`; `session_revoked` deja `expired`, con correo y sin token
  - dos `refresh` concurrentes sobre el mismo token: una llamada al proveedor
  - `sign_out` durante `refresh`: termina `signed_out`
  - `sign_out` sin red: borra lo local y pone `gate_skipped` en False
  - llavero no disponible: leer da `signed_out`; escribir deja la sesión en memoria con `is_persisted=False`
  - si el llavero no deja borrar al salir: `KeychainUnavailableError`
  - `confirm` con contraseña débil y reintento con el mismo código: una sola `verify_recovery`
  - el `repr` de los objetos no contiene contraseña ni tokens
- [ ] Implementar hasta que pasen: `uv run --no-sync pytest tests/application/test_account.py tests/architecture --no-cov -q`
- [ ] `ruff check`, `black --check`, `mypy argus`. Commit `feat(cuenta): dominio y casos de uso`.

### Task 2: Supabase, llavero, configuración y rutas

Dificultad alta: seguridad e integración.

**Files:**
- Create: `engine/argus/infrastructure/identity/` (`__init__`, `supabase_identity_provider`, `supabase_errors`, `keyring_session_store`, `account_configuration`), `engine/argus/infrastructure/persistence/sqlite_gate_preference.py`, `engine/argus/api/account_composition.py`, `engine/argus/api/routes/account.py`, `engine/argus/api/schemas/account.py`
- Modify: `engine/argus/api/app.py`, `composition.py`, `error_handlers.py`, `ocr_composition.py` (donde vive `ExternalAdapters`) y `offline_adapters` de las pruebas
- Test: `engine/tests/infrastructure/test_supabase_identity_provider.py`, `engine/tests/infrastructure/test_account_storage.py`, `engine/tests/api/test_account.py`

**Interfaces:**
- Consumes: todo lo que produce la tarea 1.
- Produces: el contrato HTTP del plan (tabla de rutas, `AccountState` y errores); `AccountConfiguration(url, publishable_key)`; `read_account_configuration(environ, bundled_file) -> AccountConfiguration | None`.

**Contrato de las rutas** (camelCase, con el token interno): `GET /account`, `POST /account/{refresh,sign-up,verify,sign-in,sign-out,skip,password-reset,password-reset/confirm}`. Todas devuelven `{status, account: {id, email, displayName} | null, email, gateSkipped, isOffline, isPersisted}`, salvo sign-up (`{state, needsConfirmation}`) y password-reset (204). Estados HTTP: invalid_credentials 401, email_not_confirmed 403, invalid_code 422, email_taken 409, weak_password 422, rate_limited 429, email_unavailable 503, offline 503, keychain_unavailable 503, account_unavailable 409.

**Supabase:**
- Cabecera `apikey`. `Authorization: Bearer <access_token>` solo en logout y en `PUT /auth/v1/user`.
- Timeout de 8 s, sin redirecciones.
- Rutas bajo `/auth/v1`: `/signup` (con `data.display_name`), `/token?grant_type=password|refresh_token`, `/verify` (`type` signup o recovery, `email`, `token`), `/recover`, `/logout?scope=local`, `/user`.
- El código de error viene en `code` si es texto; si no, en `error_code`.

| Supabase | ARGUS |
|---|---|
| `invalid_credentials` | invalid_credentials |
| `email_not_confirmed` | email_not_confirmed |
| `otp_expired` | invalid_code |
| `user_already_exists`, `email_exists`, alta con `identities: []` | email_taken |
| `weak_password` | weak_password |
| `over_email_send_rate_limit`, `over_request_rate_limit`, 429 | rate_limited |
| `email_address_not_authorized` | email_unavailable |
| al renovar: `refresh_token_not_found`, `refresh_token_already_used`, `session_not_found`, `session_expired`, `user_not_found`, `user_banned` | session_revoked |
| red, timeout, 5xx, no JSON, desconocido | offline |

**Almacenamiento y configuración:**
- `ExternalAdapters` gana los adaptadores de cuenta; las pruebas existentes siguen sin tocar el llavero.
- Llavero: `ChunkedSecretStore` con cuenta `account-session`. Un JSON ilegible cuenta como «sin sesión».
- Las variables `ARGUS_SUPABASE_URL` y `ARGUS_SUPABASE_PUBLISHABLE_KEY` mandan sobre el archivo empaquetado `account-config.json` (`{"url", "publishableKey"}`).
- Solo `https`, o `http` en localhost y 127.0.0.1.
- Una clave `sb_secret_` o un JWT con `role=service_role` se rechaza.
- Configuración ausente o inválida: `None`.

**Steps:**
- [ ] Pruebas que fallan: una por fila del mapeo; cada petición exacta; configuración válida, ausente y secreta; sesión de 3000 caracteres en un llavero con tope de 1280; cada ruta; 401 sin token; la marca sobrevive a guardar otras preferencias; caplog y respuestas sin contraseña ni tokens.
- [ ] Implementar. Correr pytest completo, ruff, black y mypy. Commit `feat(cuenta): Supabase, llavero y rutas`.

### Task 3: Cliente, estado y pantallas

Dificultad media.

**Files:**
- Create: `app/src/services/engine/accountClient.ts`, `accountTypes.ts`, `app/src/features/account/*`
- Modify: `createEngineServices.ts`, `EngineServicesContext`, dobles de prueba, `main.tsx`, `App.tsx`, `components/organisms/Sidebar.*`, Ajustes (`settingsSections.ts` y su página), `i18n/es.json`, `i18n/en.json`, tokens si hacen falta
- Test: `accountClient.test.ts`, `features/account/*.test.tsx`, pruebas del shell y de Ajustes

**Interfaces:**
- Consumes: las rutas de `engine/argus/api/routes/account.py` y `schemas/account.py`, ya implementadas.
- Produces: `AccountProvider`, `useAccount()`, `AccountGate`, `AccountSection`.

**Pantallas:**
- Puerta: diálogo a pantalla completa. Guía visual `ARGUS Identidad`, errores según `ARGUS Estados y Mensajes`. Reutiliza TextField, Button, SegmentedControl o Tabs, ErrorMessage, el ojo o la mascota, `useModalFocus` y `useShortcuts(..., "dialog")`.
- Vistas: entrar, crear (nombre opcional), confirmar con código de 6 a 10 dígitos, pedir recuperación, código más contraseña nueva.
- Mostrar u ocultar contraseña, autocomplete correcto, Enter envía.
- Aviso literal: «Su correo y contraseña se envían a Supabase solo para verificar la cuenta. Sus documentos no salen del equipo.»
- Tras el alta: «Revise su correo para confirmar la cuenta».
- Botón «Continuar sin cuenta». Si la puerta se abrió desde Ajustes, Esc cierra sin cambiar la marca.
- Se abre sola solo con `signed_out` y sin `gateSkipped` en la primera lectura. Nunca con el motor caído, `unavailable`, `expired` ni al cerrar sesión en esta ejecución. Los Primeros pasos esperan a que se cierre.
- Tras leer `signed_in`, `refresh` en segundo plano.
- Ajustes › Cuenta y el pie de la barra lateral (iniciales y nombre o correo) no existen si `unavailable`. `expired` pide volver a entrar sin bloquear. `isPersisted=false` se avisa.

**Steps:**
- [ ] Pruebas que fallan: cada regla de apertura; cada vista; cada código de error con sus 3 partes; es y en con las mismas claves; teclado y trampa de foco; atajos globales bloqueados; respuesta vieja ignorada; la contraseña se borra al cambiar de vista y no llega a localStorage; barra lateral contraída.
- [ ] Implementar. Correr typecheck, lint, lint:css, prettier y vitest completo. Commit `feat(cuenta): puerta, Ajustes y barra lateral`.

### Task 4: Empaquetado y documentación

Dificultad baja.

**Files:**
- Create: `engine/distribution/write_account_config.py` y su prueba, `docs/decisions/033-cuenta-como-puerta-de-entrada.md`, `docs/configurar-supabase.md`
- Modify: `.github/workflows/release.yml`, `engine/distribution/argus-engine.spec`, `.gitignore`, ADR 005 (estado), `docs/progreso.md`, `README.md`

**Steps:**
- [ ] Prueba que falla: con las dos variables escribe el JSON que lee `account_configuration.py`; sin ellas no escribe y termina en 0; con una clave secreta termina distinto de 0 sin imprimirla.
- [ ] El workflow pasa los secretos al paso previo a PyInstaller. El spec incluye el archivo solo si existe.
- [ ] Guía: los dos modos de correo, plantillas con `{{ .Token }}`, secretos de GitHub, variables en desarrollo, pausa del plan gratuito.
- [ ] ruff, black, mypy y YAML válido. Commit `docs(cuenta): ADR 033, guía y empaquetado`.

### Task 5: Verificación de extremo a extremo

- [ ] Supabase falso en 127.0.0.1, motor real con datos temporales y llavero en memoria: alta con y sin confirmación, entrar, renovar, sin red, salir, recuperar.
- [ ] Capturas en claro y oscuro, a 1280x800 y 800x500, de cada vista.
- [ ] Revisión de la rama completa con el modelo más capaz. Corregir lo importante y repetir todas las pruebas.
