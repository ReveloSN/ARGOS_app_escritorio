from collections.abc import Sequence
from functools import cached_property
from pathlib import Path
from threading import Lock

import numpy as np
import numpy.typing as npt
import onnxruntime as ort
from tokenizers import Tokenizer

from argus.application.ports.text_embedder import Embedding

# Las frases que se comparan son cortas (un fragmento); más tokens no cambian el tema.
MAX_TOKENS = 128

type Matrix = npt.NDArray[np.float32]


class OnnxTextEmbedder:
    """Embeddings multilingües en ONNX, sin PyTorch (ADR 002); adaptador local por defecto.

    Promedia los vectores de los tokens (mean pooling, como sentence-transformers) y normaliza
    el resultado. El modelo se carga la primera vez que se usa, no al arrancar el motor.
    """

    def __init__(self, model_directory: Path) -> None:
        self._model_directory = model_directory
        self._lock = Lock()

    @cached_property
    def _tokenizer(self) -> Tokenizer:
        tokenizer = Tokenizer.from_file(str(self._model_directory / "tokenizer.json"))
        tokenizer.enable_truncation(MAX_TOKENS)
        tokenizer.enable_padding()
        return tokenizer

    @cached_property
    def _session(self) -> ort.InferenceSession:
        return ort.InferenceSession(str(self._model_directory / "model.onnx"))

    def embed(self, texts: Sequence[str]) -> tuple[Embedding, ...]:
        if not texts:
            return ()
        with self._lock:
            vectors = self._embed(texts)
        return tuple(tuple(float(value) for value in vector) for vector in vectors)

    def _embed(self, texts: Sequence[str]) -> Matrix:
        encodings = self._tokenizer.encode_batch(list(texts))
        ids = np.array([encoding.ids for encoding in encodings], dtype=np.int64)
        mask = np.array([encoding.attention_mask for encoding in encodings], dtype=np.int64)
        feeds = {"input_ids": ids, "attention_mask": mask, "token_type_ids": np.zeros_like(ids)}
        hidden: Matrix = self._session.run(None, feeds)[0]
        weights = mask[..., np.newaxis].astype(np.float32)
        pooled = (hidden * weights).sum(axis=1) / np.clip(weights.sum(axis=1), 1e-9, None)
        norms: Matrix = np.linalg.norm(pooled, axis=1, keepdims=True)
        return pooled / np.clip(norms, 1e-9, None)
