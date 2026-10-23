import pytest

from argus.infrastructure.nlp.onnx_text_embedder import OnnxTextEmbedder
from benchmarks.meaning_benchmark import CASES, Case, build_comparer, moved_clause, run_case
from tests.model_availability import MODEL_DIRECTORY, requires_embedding_model


@requires_embedding_model
@pytest.mark.parametrize("case", CASES, ids=[case.name for case in CASES])
def test_the_benchmark_cases_get_the_expected_suggestion(case: Case) -> None:
    embedder = OnnxTextEmbedder(MODEL_DIRECTORY)

    outcome = run_case(build_comparer(embedder), embedder, case)

    assert outcome.is_hit, outcome


@requires_embedding_model
def test_a_clause_that_only_moves_has_no_suggestion() -> None:
    assert moved_clause(build_comparer(OnnxTextEmbedder(MODEL_DIRECTORY))) == ["moved:None"]
