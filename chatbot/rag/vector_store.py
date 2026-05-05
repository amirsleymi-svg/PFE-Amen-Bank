import os
import logging
from typing import List, Dict, Any, Optional, Tuple
import chromadb
from chromadb.config import Settings
import faiss
import numpy as np
from rag.config import settings
from rag.embedding_manager import embedding_manager

logger = logging.getLogger("VectorStore")

class VectorStore:
    def __init__(self):
        self.backend = settings.vectorstore.backend.lower()
        self.persist_dir = settings.vectorstore.persist_directory
        self.collection_name = settings.vectorstore.collection_name
        
        if not os.path.exists(self.persist_dir):
            os.makedirs(self.persist_dir)

        if self.backend == "chroma":
            self._init_chroma()
        else:
            self._init_faiss()

    def _init_chroma(self):
        try:
            self.client = chromadb.PersistentClient(path=self.persist_dir)
            self.collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            logger.info(f"ChromaDB initialized at {self.persist_dir}")
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}. Falling back to FAISS.")
            self.backend = "faiss"
            self._init_faiss()

    def _init_faiss(self):
        # FAISS implementation for fallback
        self.index_path = os.path.join(self.persist_dir, "faiss.index")
        self.metadata_path = os.path.join(self.persist_dir, "faiss_metadata.npy")
        self.dim = settings.embeddings.dimension
        
        if os.path.exists(self.index_path):
            self.index = faiss.read_index(self.index_path)
            self.doc_metadata = np.load(self.metadata_path, allow_pickle=True).tolist()
            logger.info("FAISS index loaded from disk.")
        else:
            # For small datasets, Flat index is fine. 
            # For >10k docs, IVFFlat would be better but requires training.
            self.index = faiss.IndexFlatIP(self.dim) # Inner Product on normalized vectors = Cosine Similarity
            self.doc_metadata = []
            logger.info("New FAISS index created.")

    def add_documents(self, documents: List[Any]):
        if not documents:
            return

        texts = [doc.content for doc in documents]
        metadatas = [doc.metadata for doc in documents]
        ids = [f"{doc.metadata['source']}_{doc.metadata['chunk_id']}" for doc in documents]
        
        embeddings = embedding_manager.embed_documents(texts)

        if self.backend == "chroma":
            self.collection.add(
                embeddings=embeddings.tolist(),
                metadatas=metadatas,
                documents=texts,
                ids=ids
            )
            logger.info(f"Added {len(documents)} documents to ChromaDB.")
        else:
            self.index.add(embeddings.astype('float32'))
            self.doc_metadata.extend([{"content": t, "metadata": m} for t, m in zip(texts, metadatas)])
            faiss.write_index(self.index, self.index_path)
            np.save(self.metadata_path, self.doc_metadata)
            logger.info(f"Added {len(documents)} documents to FAISS.")

    def similarity_search(self, query: str, top_k: int = 6) -> List[Dict[str, Any]]:
        query_embedding = embedding_manager.embed_query(query).tolist()
        
        results = []
        if self.backend == "chroma":
            search_results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                include=["documents", "metadatas", "distances"]
            )
            
            for i in range(len(search_results['ids'][0])):
                # Chroma distances: smaller is better for cosine. 
                # We convert to score where higher is better (1 - distance)
                results.append({
                    "content": search_results['documents'][0][i],
                    "metadata": search_results['metadatas'][0][i],
                    "score": 1.0 - search_results['distances'][0][i]
                })
        else:
            query_arr = np.array([query_embedding]).astype('float32')
            distances, indices = self.index.search(query_arr, top_k)
            
            for i in range(len(indices[0])):
                idx = indices[0][i]
                if idx != -1:
                    results.append({
                        "content": self.doc_metadata[idx]["content"],
                        "metadata": self.doc_metadata[idx]["metadata"],
                        "score": float(distances[0][i])
                    })
        
        return results

    def mmr_search(self, query: str, top_k: int = 6, fetch_k: int = 20, lambda_param: float = 0.5) -> List[Dict[str, Any]]:
        """Maximal Marginal Relevance search."""
        query_embedding = embedding_manager.embed_query(query)
        
        # 1. Fetch more candidates than needed
        candidates = self.similarity_search(query, top_k=fetch_k)
        if not candidates:
            return []

        # 2. Re-embed candidates for MMR calculation if not already available
        # In a real system, we'd pull embeddings from the DB, but for simplicity:
        candidate_embeddings = embedding_manager.embed_documents([c["content"] for c in candidates])
        
        # MMR Algorithm implementation
        selected_indices = []
        unselected_indices = list(range(len(candidates)))
        
        # Initial selection
        best_initial = np.argmax([c["score"] for c in candidates])
        selected_indices.append(best_initial)
        unselected_indices.remove(best_initial)
        
        while len(selected_indices) < min(top_k, len(candidates)):
            mmr_scores = []
            for unselected_idx in unselected_indices:
                # Relevance to query
                relevance = candidates[unselected_idx]["score"]
                
                # Redundancy to selected
                redundancy = max([np.dot(candidate_embeddings[unselected_idx], candidate_embeddings[sel_idx]) 
                                 for sel_idx in selected_indices])
                
                mmr_score = lambda_param * relevance - (1 - lambda_param) * redundancy
                mmr_scores.append((mmr_score, unselected_idx))
            
            best_idx = max(mmr_scores, key=lambda x: x[0])[1]
            selected_indices.append(best_idx)
            unselected_indices.remove(best_idx)
            
        return [candidates[i] for i in selected_indices]

    def delete_collection(self):
        if self.backend == "chroma":
            self.client.delete_collection(self.collection_name)
            self._init_chroma()
        else:
            if os.path.exists(self.index_path): os.remove(self.index_path)
            if os.path.exists(self.metadata_path): os.remove(self.metadata_path)
            self._init_faiss()
        logger.info("Vector collection cleared.")
