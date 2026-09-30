"""Portable vector-type helpers.

The production database is PostgreSQL + pgvector. To keep the same models
working in local demo mode (SQLite), embeddings are stored as a JSON-encoded
list of floats via a TypeDecorator. On Postgres this could be swapped for the
native `pgvector.sqlalchemy.Vector` type; the vector store service performs
cosine similarity in Python so the behaviour is identical either way.
"""
from __future__ import annotations

import json
from typing import Any

from sqlalchemy.types import Text, TypeDecorator


class JSONVector(TypeDecorator):
    """Store a list[float] embedding as JSON text so it works on any backend."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value: Any, dialect) -> Any:
        if value is None:
            return None
        return json.dumps([float(x) for x in value])

    def process_result_value(self, value: Any, dialect) -> Any:
        if value is None:
            return None
        return json.loads(value)
