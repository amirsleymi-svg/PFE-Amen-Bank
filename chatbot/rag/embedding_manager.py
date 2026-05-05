import logging
import numpy as np
from typing import List, Union
from sentence_transformers import SentenceTransformer
from rag.config import settings

logger = logging.getLogger("EmbeddingManager")

class EmbeddingManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        
        logger.info(f"Initializing Embedding model: {settings.embeddings.model_name}")
        try:
            self.model = SentenceTransformer(settings.embeddings.model_name)
            self._initialized = True
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise

    def embed_documents(self, texts: List[str]) -> np.ndarray:
        """Batch encode multiple documents."""
        try:
            embeddings = self.model.encode(
                texts,
                batch_size=settings.embeddings.batch_size,
                show_progress_bar=False,
                normalize_embeddings=settings.embeddings.normalize
            )
            return embeddings
        except Exception as e:
            logger.error(f"Error during document embedding: {e}")
            return np.array([])

    def embed_query(self, text: str) -> np.ndarray:
        """Embed a single query."""
        try:
            embedding = self.model.encode(
                text,
                show_progress_bar=False,
                normalize_embeddings=settings.embeddings.normalize
            )
            return embedding
        except Exception as e:
            logger.error(f"Error during query embedding: {e}")
            return np.array([])

# Export a singleton instance
embedding_manager = EmbeddingManager()
