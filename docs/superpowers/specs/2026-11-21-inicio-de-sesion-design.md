# Inicio de sesión — diseño

Fecha: 21 nov 2026 · Rama: `feat/inicio-de-sesion`

## Intención

ARGUS gana una cuenta de usuario que funciona como **puerta de entrada**: identifica a quien usa la app. No protege datos ni los sube a ningún sitio. El historial, los expedientes y los documentos siguen solo en el equipo (CLAUDE.md §8).

Lo dijo el usuario:
- Solo puerta de entrada; nada se sincroniza.
- No le preocupa que alguien entre sin sesión: «que pueda pasar igual».
- Quiere la opción más sencilla: se eligió Supabase Auth.

## Objetivos

- Crear cuenta con correo y contraseña, verificar el correo, iniciar sesión, cerrar sesión y recuperar la contraseña.
- La sesión se recuerda: al reabrir ARGUS no se vuelve a pedir.
- Sin conexión se entra igual con la sesión guardada.
- Se ve quién está dentro: nombre o correo en la barra lateral y en Ajustes › Cuenta.

## No objetivos

- Sincronizar el historial, las preferencias o los expedientes.
- Roles, organizaciones o administración de usuarios.
- Inicio con Google o Microsoft. Queda para después: Supabase lo permite sin cambiar este diseño.
- Cifrar la base local.

## Anti-objetivos (fallaría aunque funcione)

- Que cualquier documento, fragmento o nombre de archivo salga del equipo por la cuenta.
- Que la app quede inutilizable sin internet o con Supabase caído.
- Guardar la contraseña o los tokens fuera del llavero del sistema (en SQLite, archivos o `localStorage`).
- Pantallas de cuenta que rompan las reglas de interfaz de §9: un acento, tokens, WCAG AA, errores en 3 partes y teclado completo.

## Restricciones

- Arquitectura hexagonal del motor (§3) y código limpio (§4): funciones de 20 líneas o menos, 3 parámetros o menos, archivos de 150 líneas o menos.
- La interfaz solo habla con el motor local (`services/engine`). La CSP de Tauri no cambia.
- Multiplataforma (§12): el llavero vía `keyring`, como ya hace la clave de IA.
- Sin dependencias nuevas: el motor ya tiene `requests` y `keyring`.

## Enfoques considerados

| Enfoque | Qué ofrece | Qué cuesta |
|---|---|---|
| **A. Supabase Auth (elegido)** | Correo de verificación, recuperación y límite de intentos ya resueltos. Plan gratuito. Lo más sencillo de asegurar. | Depende de un tercero. El usuario crea el proyecto en supabase.com. |
| B. Servidor propio (FastAPI o Spring) | Control total. | Alojarlo y hacer a mano los correos, la recuperación y el límite de intentos. Semanas de trabajo, y la seguridad es nuestra. |
| C. Solo Google o Microsoft | Sin servidor ni contraseñas propias. | Excluye a quien no tenga esas cuentas, y registrar la app tiene trámites. |

Se eligió A porque es la más sencilla (la pidió el usuario).

## Diseño

### Dónde vive

**En el motor, no en la interfaz.** Es decisión mía. Así el llavero, que ya está en el motor, guarda la sesión; la CSP no se abre a internet, y la lógica queda probada con las mismas herramientas.

- `domain/account.py`: `Account` (id, email, display_name) y `AccountSession` (cuenta, token de acceso, token de renovación, vencimiento).
- `application/ports/identity_provider.py`: puerto `IdentityProvider` con `sign_up`, `sign_in`, `refresh`, `sign_out` y `request_password_reset`.
- `application/account_use_cases.py`: casos de uso `SignUp`, `SignIn`, `SignOut`, `CurrentAccount` y `ResetPassword`. Dependen del puerto y de un `SessionStore`.
- `infrastructure/identity/supabase_identity_provider.py`: llama a la API REST de Supabase Auth (`/auth/v1/signup`, `/token?grant_type=password|refresh_token`, `/logout`, `/recover`) con `requests`.
- `infrastructure/identity/keyring_session_store.py`: guarda la sesión como JSON en el llavero (servicio `ARGUS`, cuenta `account-session`).
- `api/routes/account.py`, con estas rutas:
  - `GET /account`: estado.
  - `POST /account/sign-up`
  - `POST /account/verify`
  - `POST /account/sign-in`
  - `POST /account/sign-out`
  - `POST /account/password-reset`
  - `POST /account/password-reset/confirm`

### Configuración

- `ARGUS_SUPABASE_URL` y `ARGUS_SUPABASE_PUBLISHABLE_KEY` son públicas por diseño de Supabase. En desarrollo van en variables de entorno; en los instaladores se inyectan desde los secretos de GitHub Actions en `release.yml`.
- **Sin configuración, la función de cuenta no aparece** y ARGUS funciona como hoy. Las pruebas y la CI no dependen de Supabase.

### Estados de `GET /account`

| Estado | Cuándo |
|---|---|
| `unavailable` | Sin configuración. |
| `signed_out` | Configurado y sin sesión guardada. |
| `signed_in` | Con `account`. Si el token venció, se intenta renovar; sin red se mantiene `signed_in` con `offline: true`. |
| `signed_in` + `expired` | Supabase rechazó la renovación (la cuenta se borró o se cerró la sesión en otro lado). La interfaz pide volver a entrar, pero no bloquea. |

### Interfaz

- **Puerta al abrir.** Pantalla completa antes del shell, como `OnboardingGate`, con estos controles:
  - Pestañas «Iniciar sesión» y «Crear cuenta».
  - Correo y contraseña. Al crear cuenta, también nombre opcional.
  - «¿Olvidó su contraseña?».
  - Botón secundario «Continuar sin cuenta», por el «que pueda pasar igual». Es una propuesta mía: recuerda la elección y no vuelve a preguntar hasta que la persona elija «Iniciar sesión» en Ajustes.
- Tras crear la cuenta se muestra «Revise su correo para confirmar la cuenta», con «Ya la confirmé, iniciar sesión».
- **Ajustes › Cuenta.** Con sesión: correo, nombre y «Cerrar sesión». Sin sesión: «Iniciar sesión».
- **Barra lateral.** Iniciales y nombre al pie.
- **Errores en 3 partes** (§9):
  - Credenciales incorrectas.
  - Correo sin confirmar.
  - Sin conexión.
  - Demasiados intentos (lo devuelve Supabase).
- Todo en `es.json` y `en.json`.

### Seguridad

- La contraseña viaja solo del formulario al motor local (con su token interno) y de ahí a Supabase por HTTPS. Nunca se guarda.
- Los tokens van solo en el llavero. Los registros (logs) nunca incluyen la contraseña ni los tokens.
- Si el llavero no está disponible, la sesión dura mientras la app esté abierta y se avisa.

### Decisiones tomadas tras la revisión (mías; el usuario puede corregirlas)

1. **Códigos por correo, no enlaces.** Una app de escritorio no tiene una URL donde caiga el enlace de Supabase.
   - Las plantillas de correo de Supabase envían un código de 6 dígitos (`{{ .Token }}`).
   - Confirmar la cuenta: `POST /account/verify`, con el correo y el código (`/auth/v1/verify`, `type=signup`).
   - Recuperar la contraseña: `POST /account/password-reset`, que envía el código; luego `POST /account/password-reset/confirm`, con el correo, el código y la contraseña nueva (`type=recovery` y después `PUT /auth/v1/user`).
   - Sin protocolo propio, sin página alojada y sin cambios en la CSP ni en los instaladores.
   - Si el proyecto tiene la confirmación automática, `sign_up` devuelve la sesión y se entra directo.
2. **Aviso de privacidad (§8).** La puerta dice, en una línea: «Su correo y contraseña se envían a Supabase solo para verificar la cuenta. Sus documentos no salen del equipo.» Ese aviso, y la elección explícita entre entrar y «Continuar sin cuenta», son el consentimiento. Se registra en el ADR 033.
3. **Cuándo aparece la puerta.**
   - Sin Supabase configurado, nunca aparece.
   - «Continuar sin cuenta» se guarda en las preferencias del motor (`account_gate_skipped`). La puerta no vuelve hasta que la persona elija «Iniciar sesión» en Ajustes.
   - Cerrar sesión borra esa marca: la próxima vez que se abra la app aparece la puerta.
4. **Contrato de `/account/*`.**
   - Usa el mismo token interno que el resto del motor.
   - Los errores llevan un `code` estable, que la interfaz traduce al mensaje en 3 partes: `invalid_credentials`, `email_not_confirmed`, `invalid_code`, `email_taken`, `weak_password`, `rate_limited`, `offline` y `keychain_unavailable`.
   - En el estado `expired`, se borra la sesión del llavero y se conserva el correo para rellenar el formulario.
5. **Configuración de Supabase (corregido el 22 nov con la documentación oficial).**
   - El correo incluido solo envía a miembros del proyecto (2 por hora) y los proyectos gratuitos creados desde el 3 jun 2026 no pueden editar sus plantillas. Con él los códigos no sirven.
   - **Modo con correo:** el usuario configura un SMTP propio, activa la confirmación y cambia las 2 plantillas para que envíen el código. Funciona todo.
   - **Modo sin correo:** el usuario apaga «Confirm Email». Crear cuenta entra directo; la recuperación no está disponible y responde `email_unavailable`, con su mensaje en 3 partes.
   - El motor admite los dos modos sin cambios de código; se elige al configurar el proyecto.
   - El código del correo puede tener de 6 a 10 dígitos: su longitud se configura en Supabase.
6. **ADR 005.** Decía «no hay cuentas ni inicio de sesión». El ADR 033 reemplaza esa parte, por pedido del usuario.
7. **Precisiones técnicas al leer el código.**
   - En el llavero van solo la cuenta y el token de renovación (el de acceso queda en memoria), con `ChunkedSecretStore` por el límite de tamaño de Windows.
   - `GET /account` no usa la red. La renovación es `POST /account/refresh`: abrir ARGUS nunca espera a internet.
   - La sesión vencida se informa como `expired`, con el correo.
   - `account_gate_skipped` tiene su propio repositorio sobre la tabla de preferencias: guardar otros Ajustes no lo pisa.
   - Los instaladores llevan la configuración en un archivo generado al empaquetar, porque una variable de la CI no existe en el equipo de quien instala.

## Lo que queda al constructor

- Nombres exactos de los componentes y archivos de la interfaz, y su división en átomos y organismos.
- Cómo simular Supabase en las pruebas (servidor falso o doble del puerto).
- Textos finales de la interfaz, siguiendo el tono de `es.json`.

## Lo que hará el usuario

- Crear el proyecto en supabase.com.
- Pasar la URL y la clave publicable.
- Agregarlas como secretos del repositorio para los instaladores.
