"""Benchmark de «reformulado» frente a «cambio de sentido» con el embedder local (ADR 024).

Compara versiones de cláusulas del expediente de los mockups con la misma maquinaria que la
pantalla Comparar y escribe una tabla Markdown con la similitud y la sugerencia de cada caso.

    uv run python -m benchmarks.meaning_benchmark
"""

import sys
from dataclasses import dataclass
from pathlib import Path

from argus.api.comparison_composition import build_segment_similarity
from argus.api.composition import build_entity_extraction_pipeline, build_text_embedder
from argus.api.settings import EngineSettings
from argus.application.ports.text_embedder import TextEmbedder
from argus.application.text_comparison.change_detector import ChangeDetector
from argus.application.text_comparison.change_facts import ChangeFactsReader
from argus.application.text_comparison.document_pair_comparer import DocumentPairComparer
from argus.application.text_comparison.meaning_classifier import (
    RuleAndSimilarityMeaningClassifier,
)
from argus.application.text_comparison.segment_aligner import SegmentAligner
from argus.application.text_comparison.segment_similarity import SemanticSegmentSimilarity
from argus.domain.document import Document, DocumentFormat, TextFragment
from argus.domain.locations import ParagraphLocation
from argus.domain.text_comparison.materiality import MATERIALITY_CLASSIFIER
from argus.domain.text_comparison.modes import DocumentPair
from argus.domain.text_comparison.segmenter import DocumentSegmenter

NO_SUGGESTION = "sin sugerencia"
# Umbral de alineación del modo «versiones» (ADR 019).
VERSIONS_THRESHOLD = 0.6
CONTEXT = "Cláusula de vigencia: el contrato dura treinta y seis meses desde la firma."


@dataclass(frozen=True)
class Case:
    name: str
    expected: str
    before: str
    after: str


CASES = (
    Case(
        "Número transpuesto (4857 vs 4587)",
        "meaning_change",
        "Contrato No. 4857 de arrendamiento de bodega.",
        "Contrato No. 4587 de arrendamiento de bodega.",
    ),
    Case(
        "Negación",
        "meaning_change",
        "El arrendatario podrá terminar el contrato con treinta días de aviso.",
        "El arrendatario no podrá terminar el contrato con treinta días de aviso.",
    ),
    Case(
        "Reformulación",
        "reworded",
        "El arrendatario pagará el canon dentro de los primeros cinco días de cada mes.",
        "El canon será pagado por el arrendatario en los cinco primeros días de cada mes.",
    ),
    Case(
        "Reformulación del objeto",
        "reworded",
        "La bodega se usará para almacenar mercancía del arrendatario.",
        "El arrendatario usará la bodega para el almacenamiento de su mercancía.",
    ),
    Case(
        "Uso permitido se reduce",
        "meaning_change",
        "La bodega se destinará al almacenamiento y distribución de mercancía.",
        "La bodega se destinará únicamente al almacenamiento de mercancía.",
    ),
    Case(
        "Facultad pasa a obligación",
        "meaning_change",
        "El arrendador podrá revisar el inmueble cada seis meses.",
        "El arrendador deberá revisar el inmueble cada seis meses.",
    ),
    Case(
        "Solo mayúsculas",
        "reworded",
        "El Arrendatario entrega la bodega.",
        "El ARRENDATARIO entrega la bodega.",
    ),
)


def document(name: str, *paragraphs: str) -> Document:
    fragments = tuple(
        TextFragment(text, ParagraphLocation(n)) for n, text in enumerate(paragraphs, 1)
    )
    return Document(name, DocumentFormat.DOCX, fragments)


@dataclass(frozen=True)
class Outcome:
    case: Case
    similarity: float
    materialities: str
    meaning: str
    confidence: float | None

    @property
    def is_hit(self) -> bool:
        return self.meaning == self.case.expected


def build_comparer(embedder: TextEmbedder) -> DocumentPairComparer:
    """La misma maquinaria de la pantalla Comparar, con el clasificador de sentido."""
    detector = ChangeDetector(
        ChangeFactsReader(build_entity_extraction_pipeline()),
        MATERIALITY_CLASSIFIER,
        RuleAndSimilarityMeaningClassifier(SemanticSegmentSimilarity(embedder)),
    )
    aligner = SegmentAligner(build_segment_similarity(embedder))
    return DocumentPairComparer(DocumentSegmenter(), aligner, detector)


def run_case(comparer: DocumentPairComparer, embedder: TextEmbedder, case: Case) -> Outcome:
    pair = DocumentPair(
        document("v2.docx", CONTEXT, case.before), document("v3.docx", CONTEXT, case.after)
    )
    change, *_ = comparer.compare(pair, VERSIONS_THRESHOLD).changes
    ((score,),) = SemanticSegmentSimilarity(embedder).scores([case.before], [case.after])
    meaning = change.meaning
    return Outcome(
        case,
        score,
        ", ".join(change.materialities),
        meaning.meaning if meaning else NO_SUGGESTION,
        meaning.confidence if meaning else None,
    )


def moved_clause(comparer: DocumentPairComparer) -> list[str]:
    """Una cláusula idéntica que solo cambia de lugar: movida, sin sugerencia."""
    clause = CASES[2].before
    pair = DocumentPair(document("v2.docx", CONTEXT, clause), document("v3.docx", clause, CONTEXT))
    changes = comparer.compare(pair, VERSIONS_THRESHOLD).changes
    return [f"{change.kind}:{change.meaning}" for change in changes]


def _row(outcome: Outcome) -> str:
    confidence = "" if outcome.confidence is None else f" ({outcome.confidence:.2f})"
    cells = (
        outcome.case.name,
        outcome.case.expected,
        f"{outcome.similarity:.3f}",
        outcome.materialities,
        f"{outcome.meaning}{confidence}",
        "sí" if outcome.is_hit else "no",
    )
    return "| " + " | ".join(cells) + " |"


def main() -> int:
    settings = EngineSettings.from_installed_package("benchmark", data_directory=Path())
    embedder = build_text_embedder(settings.models_directory)
    if embedder is None:
        print("Falta el modelo: uv run python -m argus.infrastructure.nlp.embedding_model")
        return 1
    comparer = build_comparer(embedder)
    outcomes = [run_case(comparer, embedder, case) for case in CASES]
    print("| Caso | Esperado | Similitud | Materialidad | Sugerencia | Acierto |")
    print("|---|---|---|---|---|---|")
    for outcome in outcomes:
        print(_row(outcome))
    print(f"Cláusula movida: {moved_clause(comparer)}")
    print(f"Aciertos: {sum(o.is_hit for o in outcomes)} de {len(CASES)}")
    return 0


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())
