"""Embedding providers.

In production this wraps LangChain's OpenAI embeddings (via the configured
`OpenAIEmbeddings`). When running in local demo mode we use a deterministic
feature-hashing embedding so semantic-ish retrieval still works with no
external API key or network access.
"""
from __future__ import annotations

import hashlib
import math
import re
from functools import lru_cache

import numpy as np

from app.config import settings


class DemoEmbeddings:
    """Deterministic, local feature-hashing embedding.

    We hash word + character n-grams into a fixed-size vector using the
    "hashing trick". Because shared vocabulary maps to the same dimensions,
    texts that share words end up with similar (cosine) vectors, which is
    enough for meaningful demo retrieval without any external service.
    """

    def __init__(self, dimensions: int = 384) -> None:
        self.dimensions = dimensions
        self._word_re = re.compile(r"\w+", re.UNICODE)

    def _tokens(self, text: str) -> list[str]:
        words = [w.lower() for w in self._word_re.findall(text)]
        ngrams: list[str] = []
        for w in words:
            ngrams.append(w)
            if len(w) > 3:
                ngrams.append(w[:2])
                ngrams.append(w[-2:])
        # character trigrams for robustness on German compounds
        clean = re.sub(r"\W", " ", text.lower())
        for i in range(len(clean) - 2):
            ngrams.append(clean[i : i + 3])
        return ngrams

    def embed(self, text: str) -> np.ndarray:
        vec = np.zeros(self.dimensions, dtype=np.float32)
        if not text:
            return vec
        for token in self._tokens(text):
            h = hashlib.md5(token.encode("utf-8")).digest()
            idx = int.from_bytes(h[:4], "little") % self.dimensions
            sign = 1.0 if h[4] % 2 == 0 else -1.0
            vec[idx] += sign
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self.embed(t).tolist() for t in texts]

    def embed_query(self, text: str) -> list[float]:
        return self.embed(text).tolist()


@lru_cache
def _get_demo_embeddings() -> DemoEmbeddings:
    return DemoEmbeddings()


def get_embeddings():
    """Return the appropriate embedding provider.

    Returns a LangChain-compatible embeddings object (Google Gemini or OpenAI
    in production) or a `DemoEmbeddings` wrapper (demo mode). The returned
    object exposes `embed_documents` and `embed_query`.
    """
    provider = settings.ai_provider
    if provider == "google":
        from langchain_google_genai import GoogleGenerativeAIEmbeddings

        return GoogleGenerativeAIEmbeddings(
            model=settings.GEMINI_EMBEDDING_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
        )
    if provider == "openai":
        from langchain_openai import OpenAIEmbeddings

        return OpenAIEmbeddings(
            model=settings.OPENAI_EMBEDDING_MODEL,
            api_key=settings.OPENAI_API_KEY,
        )
    return _get_demo_embeddings()


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a list of texts, normalising the interface for both providers."""
    provider = get_embeddings()
    result = provider.embed_documents(texts)
    return [list(map(float, r)) for r in result]


def embed_query(text: str) -> list[float]:
    """Embed a single query string."""
    provider = get_embeddings()
    return list(map(float, provider.embed_query(text)))
