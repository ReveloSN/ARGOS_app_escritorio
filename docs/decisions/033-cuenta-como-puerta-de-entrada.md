# 033 · Cuenta como puerta de entrada

- **Estado:** aceptada · 22/11/2026; reemplaza la parte de «no hay cuentas ni inicio de sesión» del ADR 005, por pedido del usuario.
- **Contexto:** el ADR 005 excluyó las cuentas porque ARGUS es local y monousuario. El usuario pidió una cuenta que identifique a quien usa la app, sin sincronizar nada. Supabase Auth resuelve el correo, la contraseña y la verificación con la opción más sencilla; ver el diseño en `docs/superpowers/specs/2026-11-21-inicio-de-sesion-design.md`.
- **Decisión:**
  - La cuenta solo identifica. No sincroniza el historial, los expedientes, las preferencias ni los documentos, y la app funciona sin conexión.
  - Siempre se puede continuar sin cuenta. Sin `ARGUS_SUPABASE_URL` y `ARGUS_SUPABASE_PUBLISHABLE_KEY`, la función no aparece.
  - Supabase Auth va detrás del puerto `IdentityProvider` del motor. La interfaz no llama a Supabase; la CSP no cambia.
  - El token de renovación solo se guarda en el llavero del sistema, con el servicio «ARGUS account». El token de acceso vive solo en memoria.
  - Consentimiento: la puerta de entrada muestra el aviso «Su correo y contraseña se envían a Supabase solo para verificar la cuenta. Sus documentos no salen del equipo.» Lo que sale del equipo es el correo, la contraseña, el nombre opcional, los códigos de verificación y los tokens de sesión, todo hacia Supabase por HTTPS. Nunca salen documentos, fragmentos de texto ni nombres de archivo.
  - La configuración de Supabase viaja en el instalador: `write_account_config.py` la escribe al empaquetar desde los secretos de GitHub Actions, y el spec la incluye solo si existe.
- **Consecuencias:**
  - La cuenta no protege los datos locales. Quien tenga acceso al equipo tiene acceso al historial, con o sin cuenta.
  - El correo no se verifica cuando la confirmación está apagada en Supabase. Es la opción sin correo de la guía `docs/configurar-supabase.md`, y en ella no hay recuperación de contraseña.
  - Un proyecto gratuito de Supabase se pausa tras un periodo de inactividad: ARGUS sigue funcionando con la sesión guardada, pero iniciar sesión falla hasta reactivar el proyecto.
  - Los instaladores con cuenta se generan solo con los secretos definidos; sin ellos salen sin cuenta.
