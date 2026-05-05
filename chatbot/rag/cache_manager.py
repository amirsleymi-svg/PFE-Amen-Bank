import os
import logging
import hashlib
import re
from typing import Optional, Any
from diskcache import Cache
from rag.config import settings

logger = logging.getLogger("CacheManager")

class CacheManager:
    def __init__(self):
        self.enabled = settings.cache.enabled
        if self.enabled:
            if not os.path.exists(settings.cache.persist_directory):
                os.makedirs(settings.cache.persist_directory)
            self.cache = Cache(settings.cache.persist_directory)
            logger.info(f"Disk cache initialized at {settings.cache.persist_directory}")
        else:
            self.cache = None
            logger.info("Cache is disabled in config.")

    def _generate_key(self, query: str, top_k: int) -> str:
        """Create a unique SHA256 key for the query and parameters."""
        raw_key = f"{query.strip().lower()}_{top_k}"
        return hashlib.sha256(raw_key.encode()).hexdigest()

    def _should_skip_cache(self, query: str) -> bool:
        """
        Skip cache for queries containing specific patterns like dates, 
        account numbers, or unique identifiers to ensure freshness.
        """
        # Detect numbers (like IBAN, account IDs) or dates
        if re.search(r'\d{4,}', query): # 4+ consecutive digits
            return True
        if re.search(r'\d{1,2}/\d{1,2}/\d{2,4}', query): # Dates
            return True
        return False

    def get(self, query: str, top_k: int) -> Optional[Any]:
        if not self.enabled or self.cache is None:
            return None
        
        if self._should_skip_cache(query):
            logger.info("Skipping cache retrieval for dynamic query.")
            return None

        key = self._generate_key(query, top_k)
        result = self.cache.get(key)
        
        if result:
            logger.info(f"Cache HIT for query: {query[:50]}...")
        else:
            logger.info(f"Cache MISS for query: {query[:50]}...")
        
        return result

    def set(self, query: str, top_k: int, value: Any):
        if not self.enabled or self.cache is None:
            return
        
        if self._should_skip_cache(query):
            return

        key = self._generate_key(query, top_k)
        self.cache.set(key, value, expire=settings.cache.ttl)
        logger.info(f"Cached result for key: {key}")

    def invalidate(self, query: str, top_k: int):
        if self.cache:
            key = self._generate_key(query, top_k)
            self.cache.delete(key)

    def clear_all(self):
        if self.cache:
            self.cache.clear()
            logger.info("Cache cleared.")
