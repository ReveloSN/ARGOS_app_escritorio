"""Lo que se le dice a cualquier proveedor: el mismo encargo para Anthropic y para DeepSeek."""

from argus.application.ai.explanation_provider import ExplanationPrompt
from argus.application.text_comparison.change_explanation import ExplanationSubject

LANGUAGES = {"es": "español", "en": "English"}
DEFAULT_LANGUAGE = "español"

ROLE = (
    "Eres el asistente de ARGUS, una herramienta que revisa documentos antes de firmarlos o "
    "enviarlos. "
)
RULES = (
    " Explica en dos o tres frases, sin viñetas ni formato. Usa solo lo que dicen los "
    "fragmentos: no supongas hechos, no des asesoría legal y no decidas por el usuario. "
    "Responde en {language}."
)
SYSTEM_PROMPTS: dict[ExplanationSubject, str] = {
    ExplanationSubject.CHANGE: ROLE
    + "Recibes la versión anterior y la nueva de un mismo fragmento. Di qué cambia en lo que "
    "el texto permite, obliga, cobra o fecha, o di que solo cambia la redacción si el sentido "
    "es el mismo." + RULES,
    ExplanationSubject.ALERT: ROLE
    + "Recibes el fragmento de origen de cada valor de una alerta: dos fragmentos de "
    "documentos distintos que deberían coincidir, o uno solo si la alerta señala un dato que "
    "no cuadra dentro de un mismo documento. Di en qué difieren o qué no cuadra y qué conviene "
    "revisar antes de firmar o enviar." + RULES,
}
MISSING_BEFORE = "(no existe en la versión anterior)"
MISSING_AFTER = "(no existe en la versión nueva)"


def system_prompt(prompt: ExplanationPrompt) -> str:
    language = LANGUAGES.get(prompt.locale, DEFAULT_LANGUAGE)
    return SYSTEM_PROMPTS[prompt.subject].format(language=language)


def user_message(prompt: ExplanationPrompt) -> str:
    if prompt.subject is ExplanationSubject.CHANGE:
        before, after = prompt.fragments
        return (
            f"Tipo de cambio: {prompt.kind}\n\n"
            f"Versión anterior:\n{before or MISSING_BEFORE}\n\n"
            f"Versión nueva:\n{after or MISSING_AFTER}"
        )
    fragments = (
        f"Fragmento {number}:\n{text}" for number, text in enumerate(prompt.fragments, start=1)
    )
    return f"Tipo de diferencia: {prompt.kind}\n\n" + "\n\n".join(fragments)
