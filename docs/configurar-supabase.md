# Configurar la cuenta de ARGUS con Supabase

La cuenta de ARGUS es opcional y solo sirve para identificar a quien usa la app (ADR 033). Esta guía le indica cómo crear el proyecto de Supabase que la respalda y cómo darla a conocer a los instaladores y a su equipo de desarrollo. Sin este paso, ARGUS funciona igual, sin la opción de cuenta.

Las direcciones y claves de este documento son marcadores: sustitúyalos por los de su proyecto.

## 1. Crear el proyecto

1. Entre en [supabase.com](https://supabase.com) y cree un proyecto con el plan gratuito.
2. Guarde la contraseña de la base de datos que Supabase le pida. ARGUS no la usa: basta con guardarla en un lugar seguro.

## 2. Elegir el modo

Hay dos modos. Elija uno antes de crear cuentas.

### Modo sin correo (el más sencillo)

1. Vaya a **Authentication › Sign In / Providers › Email**.
2. Desactive **Confirm email** y guarde.

Con este modo, crear una cuenta entra directamente, sin confirmar el correo. Tenga en cuenta dos consecuencias:

- El correo no se verifica: cualquiera puede registrar una dirección ajena.
- No hay recuperación de contraseña: la opción «¿Olvidó su contraseña?» no funcionará.

### Modo con correo

Este modo verifica el correo y permite recuperar la contraseña. Requiere pasos adicionales:

1. Configure un servidor de correo propio (SMTP personalizado) en la configuración de correo del proyecto. Es obligatorio: el remitente incluido de Supabase solo envía a los miembros del proyecto (2 mensajes por hora), y los proyectos gratuitos creados desde el 3 de junio de 2026 no pueden editar las plantillas sin un SMTP propio.
2. Vaya a **Authentication › Sign In / Providers › Email** y active **Confirm email**.
3. Vaya a las plantillas de correo de **Authentication** y edite las dos plantillas siguientes para que muestren el código, no un enlace. Incluya en el texto la variable `{{ .Token }}`:
   - **Confirm signup** (confirmar la cuenta).
   - **Reset password** (recuperar la contraseña).

La aplicación pide un código de 6 a 10 dígitos; su longitud se configura en Supabase. Una app de escritorio no tiene una dirección donde recibir un enlace, por eso se usan códigos.

## 3. Copiar la dirección y la clave

Abra la configuración de la API del proyecto (**Project Settings › API**) y copie:

- La **URL del proyecto**, con la forma `https://SU-PROYECTO.supabase.co`.
- La **clave publicable**, que empieza por `sb_publishable_`, con la forma `sb_publishable_SU_CLAVE`.

**No copie nunca la clave secreta (`sb_secret_…`) ni la clave `service_role`.** ARGUS las rechaza, pero no deben salir de su proyecto. La clave publicable sí puede viajar en la aplicación, porque está pensada para ello.

## 4. Configurar los instaladores

Los instaladores se generan en GitHub Actions. Para que lleven la cuenta:

1. En el repositorio de GitHub, vaya a **Settings › Secrets and variables › Actions**.
2. Pulse **New repository secret** y cree dos secretos, con estos nombres exactos:
   - `ARGUS_SUPABASE_URL`, con la URL del proyecto.
   - `ARGUS_SUPABASE_PUBLISHABLE_KEY`, con la clave publicable.
3. La siguiente versión (la etiqueta `vX.Y.Z`) incluirá la cuenta. Las versiones anteriores no cambian.

Si no define los secretos, el instalador se genera sin cuenta.

## 5. Desarrollo en su equipo

Las dos variables deben estar definidas en la **misma terminal** en la que ejecute la aplicación. Use los marcadores de esta guía, sustituidos por sus valores.

En Windows, con PowerShell:

```powershell
$env:ARGUS_SUPABASE_URL = "https://SU-PROYECTO.supabase.co"
$env:ARGUS_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SU_CLAVE"
npm --prefix app run tauri dev
```

En Linux o macOS:

```bash
export ARGUS_SUPABASE_URL="https://SU-PROYECTO.supabase.co"
export ARGUS_SUPABASE_PUBLISHABLE_KEY="sb_publishable_SU_CLAVE"
npm --prefix app run tauri dev
```

Ejecute el comando desde la carpeta raíz del repositorio. Si cierra la terminal, vuelva a definir las variables.

## 6. Probar la cuenta

1. Abra ARGUS. Aparece la puerta de entrada con el aviso de privacidad.
2. Elija **Crear cuenta**, escriba un correo y una contraseña, y continúe.
3. En el modo con correo, escriba el código que llega al correo. En el modo sin correo, la cuenta entra directamente.
4. En Supabase, vaya a **Authentication › Users** y compruebe que aparece la cuenta.

## 7. Pausa del plan gratuito

Un proyecto gratuito de Supabase se pausa tras un periodo sin actividad. Mientras está pausado:

- ARGUS sigue funcionando y conserva la sesión guardada en el llavero del sistema.
- Iniciar sesión, crear una cuenta o recuperar la contraseña falla hasta que reanude el proyecto desde el panel de Supabase.
