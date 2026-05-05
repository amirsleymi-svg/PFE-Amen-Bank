import logging
import numpy as np
from typing import List, Dict, Any
from rag.embedding_manager import embedding_manager

logger = logging.getLogger("Evaluator")

class RAGEvaluator:
    def __init__(self):
        pass

    def context_precision(self, retrieved_chunks: List[Dict[str, Any]], relevant_chunk_ids: List[str]) -> float:
        """
        Calculates what percentage of retrieved chunks are actually relevant.
        """
        if not retrieved_chunks:
            return 0.0
        
        # In a real evaluation, we'd compare chunk IDs if we have them.
        # Here we check if the retrieved chunk's metadata source/id matches.
        matches = 0
        for chunk in retrieved_chunks:
            cid = f"{chunk['metadata']['source']}_{chunk['metadata']['chunk_id']}"
            if cid in relevant_chunk_ids:
                matches += 1
        
        return matches / len(retrieved_chunks)

    def answer_faithfulness(self, answer: str, context_chunks: List[str]) -> float:
        """
        Check what % of answer content is actually in the context.
        Simplified version: split answer into sentences and check grounding for each.
        """
        if not answer or not context_chunks:
            return 0.0
            
        sentences = [s.strip() for s in answer.split('.') if len(s.strip()) > 10]
        if not sentences:
            return 1.0 # Short answers or "I don't know" are considered faithful to the context instruction
            
        context_blob = " ".join(context_chunks).lower()
        grounded_sentences = 0
        
        for sentence in sentences:
            # Check if majority of words in sentence exist in context
            words = [w.lower() for w in sentence.split() if len(w) > 3]
            if not words:
                grounded_sentences += 1
                continue
                
            matches = sum(1 for w in words if w in context_blob)
            if matches / len(words) > 0.5:
                grounded_sentences += 1
                
        return grounded_sentences / len(sentences)

    def answer_relevance(self, question: str, answer: str) -> float:
        """
        Cosine similarity between question and answer embedding.
        """
        q_emb = embedding_manager.embed_query(question)
        a_emb = embedding_manager.embed_query(answer)
        
        # Cosine similarity
        score = np.dot(q_emb, a_emb) / (np.linalg.norm(q_emb) * np.linalg.norm(a_emb))
        return float(score)

    def evaluate_pipeline(self, test_dataset: List[Dict[str, Any]], pipeline: Any) -> Dict[str, float]:
        """
        Run metrics over a dataset of {question, expected_answer, relevant_chunk_ids}.
        """
        results = {
            "avg_precision": [],
            "avg_faithfulness": [],
            "avg_relevance": []
        }
        
        for item in test_dataset:
            question = item["question"]
            relevant_ids = item.get("relevant_chunk_ids", [])
            
            # Run pipeline
            # Note: We need a way to get retrieved chunks from pipeline for precision
            # For this purpose, we assume pipeline has a retrieve method or we mock it
            # But the user wants a working code.
            
            # Step 1: Retrieve
            retrieved = pipeline.retriever.retrieve(question)
            results["avg_precision"].append(self.context_precision(retrieved, relevant_ids))
            
            # Step 2: Query
            resp = pipeline.query(question)
            results["avg_faithfulness"].append(self.answer_faithfulness(resp["answer"], [c["content"] for c in retrieved]))
            results["avg_relevance"].append(self.answer_relevance(question, resp["answer"]))
            
        return {k: float(np.mean(v)) for k, v in results.items()}
