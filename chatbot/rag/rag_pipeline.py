import os
import time
import logging
from typing import Dict, Any, List
from rag.config import settings
from rag.document_processor import DocumentProcessor
from rag.vector_store import VectorStore
from rag.retriever import Retriever
from rag.llm_handler import LLMHandler
from rag.cache_manager import CacheManager

logger = logging.getLogger("RAGPipeline")

class RAGPipeline:
    def __init__(self):
        self.doc_processor = DocumentProcessor()
        self.vector_store = VectorStore()
        self.retriever = Retriever(self.vector_store)
        self.llm_handler = LLMHandler()
        self.cache_manager = CacheManager()

    def ingest(self, file_path: str):
        """Process and index a file or directory."""
        start_time = time.time()
        logger.info(f"Starting ingestion for: {file_path}")
        
        try:
            if os.path.isdir(file_path):
                for root, _, files in os.walk(file_path):
                    for file in files:
                        full_path = os.path.join(root, file)
                        docs = self.doc_processor.process_file(full_path)
                        self.vector_store.add_documents(docs)
            else:
                docs = self.doc_processor.process_file(file_path)
                self.vector_store.add_documents(docs)
            
            elapsed = time.time() - start_time
            logger.info(f"Ingestion completed in {elapsed:.2f} seconds.")
        except Exception as e:
            logger.error(f"Ingestion failed: {e}")
            raise

    def query(self, question: str) -> Dict[str, Any]:
        """Execute the full RAG pipeline for a given question."""
        start_time = time.time()
        logger.info(f"Processing query: {question}")

        # 1. Check Cache
        cached_result = self.cache_manager.get(question, settings.retrieval.top_k)
        if cached_result:
            cached_result["cached"] = True
            cached_result["timing"] = time.time() - start_time
            return cached_result

        try:
            # 2. Retrieve & Rerank
            retrieved_chunks = self.retriever.retrieve(question)
            
            if not retrieved_chunks:
                return {
                    "answer": "Je n'ai pas cette information, veuillez contacter Amen Bank directement.",
                    "sources": [],
                    "grounded": False,
                    "cached": False,
                    "timing": time.time() - start_time
                }

            # 3. Build context (deduplicate and respect token limit)
            context_contents = [c["content"] for c in retrieved_chunks]
            sources = list(set([c["metadata"]["source"] for c in retrieved_chunks]))
            
            # 4. Generate Answer via Ollama
            llm_result = self.llm_handler.generate_answer(question, context_contents)
            
            # 5. Finalize response
            response = {
                "answer": llm_result["answer"],
                "sources": sources,
                "grounded": llm_result["grounded"],
                "confidence": llm_result["confidence"],
                "cached": False,
                "timing": time.time() - start_time
            }

            # 6. Cache result
            self.cache_manager.set(question, settings.retrieval.top_k, response)
            
            return response

        except Exception as e:
            logger.error(f"Error during RAG query: {e}")
            return {
                "answer": "Une erreur interne est survenue lors de la recherche d'informations.",
                "sources": [],
                "grounded": False,
                "cached": False,
                "timing": time.time() - start_time
            }
