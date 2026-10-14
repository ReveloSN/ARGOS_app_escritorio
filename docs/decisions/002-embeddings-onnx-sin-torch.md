# 002 · Embeddings con ONNX Runtime, sin PyTorch

- **Estado:** aceptada · 14/10/2026 (se implementa en la Fase 7)
- **Contexto:** sentence-transformers arrastra PyTorch, que añade cientos de MB al sidecar de PyInstaller. La comparación semántica solo necesita inferencia, no entrenamiento.
- **Decisión:** exportar `paraphrase-multilingual-MiniLM` a ONNX y ejecutarlo con `onnxruntime` + `tokenizers`, detrás de un puerto de embeddings. El modelo y `es_core_news_md` se empaquetan con el instalador.
- **Consecuencias:** instalador mucho más liviano y funcionamiento sin internet. La exportación del modelo pasa a ser un paso de build documentado y verificado en CI.
