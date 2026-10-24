# 028 · Proveedor de IA seleccionable: Anthropic o DeepSeek, cada uno con su clave

- **Estado:** aceptada · 24/10/2026. Amplía el ADR 024.
- **Contexto:** el usuario tiene una clave de DeepSeek (V4 Flash) y quiere usarla para «Explicar este cambio» y «Explicar esta alerta». Hasta ahora el único proveedor era Anthropic, con su clave en el llavero bajo `anthropic-api-key`. Se decidió con el usuario que DeepSeek conviva con Claude como opción, no que lo reemplace.
- **Decisión:**
  - **El puerto no cambia.** `ExplanationProvider` (ahora en `application/ai/explanation_provider.py`) sigue recibiendo la clave y el `ExplanationPrompt`. `AiChangeExplainer`, el consentimiento («Explicar cambios con IA») y los respaldos por plantilla son los mismos para cualquier proveedor.
  - **`AiSettings.provider`** (`anthropic` por defecto, o `deepseek`) se guarda en la tabla de preferencias (`ai_provider`). Un valor guardado que ya no exista vuelve al predeterminado.
  - **Una clave por proveedor.** `ProviderAccess` reúne, para cada proveedor, su llavero, su adaptador y su modelo. Las cuentas del llavero son `anthropic-api-key` y `deepseek-api-key`: cambiar de proveedor no mezcla ni borra la clave del otro, y Ajustes muestra «Clave guardada» según el proveedor elegido.
  - **Adaptador `DeepSeekExplanationProvider`:** llama a `POST https://api.deepseek.com/chat/completions` (formato de OpenAI) con `requests`, que ya era dependencia; no se agrega el SDK de OpenAI. Modelo `deepseek-flash`, que según la documentación de DeepSeek es el nombre vigente del modelo Flash (hoy DeepSeek-V4.1-Flash) y al que también se enruta el nombre heredado `deepseek-v4-flash`. Mismo tope de 1024 tokens y 30 s.
    - 401 o 403 → `invalid_key`; cualquier otro estado, sin red o respuesta vacía → `provider_unavailable`; `finish_reason: content_filter` → `refused`. Los mismos motivos que Anthropic, así la interfaz los explica igual.
  - **El mismo encargo para los dos.** Los textos del sistema y del usuario (`explanation_prompts.py`) se comparten: cambiar de proveedor no cambia qué se le pide ni qué sale del equipo (idioma, tipo y fragmentos de origen).
  - **API:** `GET /settings/ai` devuelve el proveedor elegido, su modelo, si tiene clave y la lista de proveedores con su modelo. `PUT /settings/ai` acepta `provider` y `explainsChanges`, cada uno opcional. `PUT` y `DELETE /settings/ai/key` actúan sobre el proveedor elegido.
  - **Ajustes › Inteligencia artificial** añade el selector «Proveedor de IA» (nombre y modelo) y adapta la etiqueta y el marcador de la clave al proveedor.
- **Consecuencias:**
  - No se llamó a la API real de DeepSeek: las pruebas usan dobles. El nombre del modelo se verificó en la documentación pública de DeepSeek el 24/10/2026.
  - Un tercer proveedor con formato de OpenAI se agregaría con otro `ProviderAccess`; uno con otro formato, con su propio adaptador.
