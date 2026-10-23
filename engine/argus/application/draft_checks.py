"""Adjuntos que el texto promete y destinatarios que no son del expediente."""

import re
from collections.abc import Iterator

from argus.application.send_checks import FoundIssue, SendContext, name_words
from argus.domain.risk import RiskLevel
from argus.domain.send_review import DraftPart, SendFix, SendFixKind, SendIssueKind
from argus.domain.text_search import fold_for_search

ATTACH_PHRASE = re.compile(
    r"\badjunt[oaé]\w*\s+(?:tambi[ée]n\s+)?(?:el|la|los|las|un|una|su|sus)\s+(?P<noun>[^\W\d_]{4,})",
    re.IGNORECASE,
)
PLURAL_SUFFIX = "s"


def _stem(noun: str) -> str:
    folded = fold_for_search(noun)
    return folded[:-1] if folded.endswith(PLURAL_SUFFIX) else folded


class MissingAttachmentCheck:
    """El texto dice que adjunta algo y ningún adjunto lo es."""

    def find(self, context: SendContext) -> Iterator[FoundIssue]:
        draft = context.content.draft
        names = [fold_for_search(name_words(item.name)) for item in draft.attachments]
        for match in ATTACH_PHRASE.finditer(draft.body):
            stem = _stem(match.group("noun"))
            if not any(stem in name for name in names):
                yield self._issue(context, match, stem)

    def _issue(self, context: SendContext, match: re.Match[str], stem: str) -> FoundIssue:
        suggestion = next(
            (name for name in context.case_documents if stem in fold_for_search(name_words(name))),
            "",
        )
        fix = SendFix(SendFixKind.ADD_ATTACHMENT, "", suggestion) if suggestion else None
        params = {"phrase": match.group(), "noun": match.group("noun"), "suggested": suggestion}
        return FoundIssue(
            SendIssueKind.MISSING_ATTACHMENT,
            RiskLevel.HIGH,
            DraftPart.BODY,
            match.group(),
            params,
            fix,
        )


def _domain(address: str) -> str:
    return address.rsplit("@", 1)[-1].casefold()


class ForeignRecipientCheck:
    """Un destinatario cuyo dominio no aparece entre los contactos del expediente."""

    def find(self, context: SendContext) -> Iterator[FoundIssue]:
        domains = {_domain(address) for address in context.contacts}
        if not domains:
            return
        draft = context.content.draft
        parts = [(DraftPart.TO, address) for address in draft.to]
        parts += [(DraftPart.CC, address) for address in draft.cc]
        for part, address in parts:
            if _domain(address) not in domains:
                fix = SendFix(SendFixKind.REMOVE_RECIPIENT, address)
                params = {"recipient": address}
                yield FoundIssue(
                    SendIssueKind.FOREIGN_RECIPIENT, RiskLevel.MEDIUM, part, address, params, fix
                )
