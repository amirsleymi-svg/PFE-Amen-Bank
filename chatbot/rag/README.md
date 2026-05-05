# Amen Bank RAG System (Improved)

Système de Recherche Augmentée par Génération (RAG) haute performance pour Amen Bank. Supporte le français et l'arabe.

## Architecture

```text
+----------------+      +-------------------+      +-----------------+
|   Documents    | ---> | DocumentProcessor | ---> | EmbeddingManager|
| (PDF,Docx,Txt) |      | (Chunking/Clean)  |      | (Multilingual)  |
+----------------+      +-------------------+      +-----------------+
                                                            |
                                                            v
+----------------+      +-------------------+      +-----------------+
|   Ollama LLM   | <--- |   RAG Pipeline    | <--- |  Vector Store   |
| (Mistral/Llama)|      | (Retriever/Cache) |      | (Chroma/FAISS)  |
+----------------+      +-------------------+      +-----------------+
        |                        ^
        v                        |
+----------------+      +-------------------+
| Final Answer   | <--- | Hallucination Guard|
+----------------+      +-------------------+
```

## Installation

1. **Installer Ollama** : [https://ollama.ai/](https://ollama.ai/)
2. **Télécharger le modèle** :
   ```bash
   ollama pull mistral
   ```
3. **Installer les dépendances** :
   ```bash
   pip install -r requirements.txt
   ```

## Utilisation (CLI)

Toutes les commandes doivent être lancées depuis le dossier `chatbot`.

### 1. Ingestion des documents
Indexez vos fichiers (PDF, DOCX, etc.) dans la base vectorielle :
```bash
python -m rag.main ingest --path ./data/docs/
```

### 2. Poser une question
Interrogez l'assistant sur les produits ou services d'Amen Bank :
```bash
python -m rag.main query --question "Quels sont les avantages du compte Epargne ?"
```

### 3. Évaluation
Évaluez la précision et la fidélité des réponses :
```bash
python -m rag.main evaluate --dataset ./tests/test_set.json
```

### 4. Vider le cache
```bash
python -m rag.main clear-cache
```

## Structure des fichiers
- `config.py` : Paramètres globaux (chunk size, model names, thresholds).
- `document_processor.py` : Chargement et nettoyage des documents.
- `embedding_manager.py` : Gestionnaire de vecteurs (Multilingual MPNet).
- `vector_store.py` : Stockage ChromaDB avec repli FAISS.
- `retriever.py` : Pipeline de recherche (MMR + Reranking Cross-Encoder).
- `llm_handler.py` : Interface Ollama avec garde-fous.
- `cache_manager.py` : Cache disque pour réponses rapides.
- `rag_pipeline.py` : Orchestrateur principal.
- `evaluator.py` : Métriques de performance (Faithfulness, Relevance).
- `main.py` : Interface en ligne de commande.

## Configuration recommandée
- **Chunk Size** : 512
- **Overlap** : 128
- **Embedding** : `paraphrase-multilingual-mpnet-base-v2`
- **Reranker** : `ms-marco-MiniLM-L-6-v2`
