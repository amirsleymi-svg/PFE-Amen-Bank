import logging
from dataclasses import dataclass, field
from typing import Optional

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("RAG-Config")

@dataclass(frozen=True)
class DocumentConfig:
    chunk_size: int = 512
    overlap: int = 128
    min_chunk_size: int = 100

@dataclass(frozen=True)
class EmbeddingConfig:
    model_name: str = "paraphrase-multilingual-mpnet-base-v2"
    dimension: int = 768
    batch_size: int = 32
    normalize: bool = True

@dataclass(frozen=True)
class VectorStoreConfig:
    backend: str = "chroma"  # options: "chroma", "faiss"
    collection_name: str = "amenbank_kb"
    persist_directory: str = "./data/vectorstore"

@dataclass(frozen=True)
class RetrievalConfig:
    top_k: int = 6
    threshold: float = 0.35
    rerank_top_k: int = 3
    search_type: str = "mmr"
    mmr_lambda: float = 0.7

@dataclass(frozen=True)
class OllamaConfig:
    base_url: str = "http://localhost:11434"
    model: str = "llama3.2:1b"
    temperature: float = 0.1
    top_p: float = 0.9
    max_tokens: int = 2048

@dataclass(frozen=True)
class CacheConfig:
    enabled: bool = True
    persist_directory: str = "./data/cache"
    ttl: int = 3600
    max_size_gb: int = 1

@dataclass
class RAGConfig:
    docs: DocumentConfig = field(default_factory=DocumentConfig)
    embeddings: EmbeddingConfig = field(default_factory=EmbeddingConfig)
    vectorstore: VectorStoreConfig = field(default_factory=VectorStoreConfig)
    retrieval: RetrievalConfig = field(default_factory=RetrievalConfig)
    ollama: OllamaConfig = field(default_factory=OllamaConfig)
    cache: CacheConfig = field(default_factory=CacheConfig)

# Singleton instance
settings = RAGConfig()
