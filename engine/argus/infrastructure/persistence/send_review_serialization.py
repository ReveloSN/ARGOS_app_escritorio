"""Borrador revisado ↔ JSON: siempre se lee entero, como las comparaciones."""

import json
from typing import Any

from argus.domain.risk import RiskLevel
from argus.domain.send_review import (
    DraftAttachment,
    DraftPart,
    EmailDraft,
    SendFix,
    SendFixKind,
    SendIssue,
    SendIssueKind,
)

type Payload = dict[str, Any]


def _draft_payload(draft: EmailDraft) -> Payload:
    return {
        "file_name": draft.file_name,
        "subject": draft.subject,
        "to": list(draft.to),
        "cc": list(draft.cc),
        "body": draft.body,
        "attachments": [{"name": item.name, "size": item.size} for item in draft.attachments],
    }


def _issue_payload(issue: SendIssue) -> Payload:
    fix = issue.fix
    return {
        "number": issue.number,
        "kind": issue.kind,
        "risk": issue.risk,
        "part": issue.part,
        "marked_text": issue.marked_text,
        "params": dict(issue.params),
        "fix": (
            None
            if fix is None
            else {"kind": fix.kind, "target": fix.target, "replacement": fix.replacement}
        ),
    }


def send_content_to_json(draft: EmailDraft, issues: tuple[SendIssue, ...]) -> str:
    payload = {"draft": _draft_payload(draft), "issues": [_issue_payload(item) for item in issues]}
    return json.dumps(payload, ensure_ascii=False)


def _draft(payload: Payload) -> EmailDraft:
    return EmailDraft(
        payload["file_name"],
        payload["subject"],
        tuple(payload["to"]),
        tuple(payload["cc"]),
        payload["body"],
        tuple(DraftAttachment(item["name"], item["size"]) for item in payload["attachments"]),
    )


def _fix(payload: Payload | None) -> SendFix | None:
    if payload is None:
        return None
    return SendFix(SendFixKind(payload["kind"]), payload["target"], payload["replacement"])


def _issue(payload: Payload) -> SendIssue:
    return SendIssue(
        payload["number"],
        SendIssueKind(payload["kind"]),
        RiskLevel(payload["risk"]),
        DraftPart(payload["part"]),
        payload["marked_text"],
        payload["params"],
        _fix(payload["fix"]),
    )


def send_content_from_json(text: str) -> tuple[EmailDraft, tuple[SendIssue, ...]]:
    payload: Payload = json.loads(text)
    return _draft(payload["draft"]), tuple(_issue(item) for item in payload["issues"])
