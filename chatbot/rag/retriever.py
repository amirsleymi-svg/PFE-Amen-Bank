import logging
from typing import List, Dict, Any
from sentence_transformers import CrossEncoder
from rag.config import settings
from rag.vector_store import VectorStore

logger = logging.getLogger("Retriever")

class Retriever:
    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store
        logger.info("Initializing CrossEncoder reranker...")
        try:
            self.reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
        except Exception as e:
            logger.error(f"Failed to load CrossEncoder: {e}. Reranking will be disabled.")
            self.reranker = None

    def filter_by_threshold(self, results: List[Dict[str, Any]], min_score: float) -> List[Dict[str, Any]]:
        """Filter out results below the similarity threshold."""
        filtered = [r for r in results if r["score"] >= min_score]
        logger.info(f"Threshold filter: {len(results)} -> {len(filtered)} chunks (min_score={min_score})")
        return filtered

    def cross_encoder_rerank(self, query: str, results: List[Dict[str, Any]], top_k: int = 3) -> List[Dict[str, Any]]:
        """Rerank results using a Cross-Encoder for higher accuracy."""
        if not results or not self.reranker:
            return results[:top_k]

        # Prepare pairs for cross-encoder
        pairs = [[query, r["content"]] for r in results]
        
        # Predict scores
        rerank_scores = self.reranker.predict(pairs)
        
        # Attach scores and sort
        for i, score in enumerate(rerank_scores):
            results[i]["rerank_score"] = float(score)
        
        reranked = sorted(results, key=lambda x: x["rerank_score"], reverse=True)
        logger.info(f"Cross-Encoder reranked {len(results)} chunks.")
        return reranked[:top_k]

    def retrieve(self, query: str) -> List[Dict[str, Any]]:
        """Complete retrieval pipeline: search → threshold → MMR → cross-encoder."""
        logger.info(f"Retrieving for query: {query}")
        
        # 1. MMR Search (or similarity if mmr is disabled in config)
        if settings.retrieval.search_type == "mmr":
            results = self.vector_store.mmr_search(
                query, 
                top_k=settings.retrieval.top_k, 
                lambda_param=settings.retrieval.mmr_lambda
            )
        else:
            results = self.vector_store.similarity_search(query, top_k=settings.retrieval.top_k)
            
        if not results:
            logger.warning("No results found in vector store.")
            return []

        # 2. Filter by threshold
        filtered_results = self.filter_by_threshold(results, settings.retrieval.threshold)
        if not filtered_results:
            logger.warning("All results filtered out by threshold.")
            return []

        # 3. Cross-Encoder Rerank
        final_results = self.cross_encoder_rerank(
            query, 
            filtered_results, 
            top_k=settings.retrieval.rerank_top_k
        )
        
        return final_results
