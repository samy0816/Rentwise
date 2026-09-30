"""RentWise FastAPI application entry point.

Wires the routers, database initialisation and demo seeding together. The app
is intentionally thin - all logic lives in the `services` / `ai` layer.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, chat, comparison, documents, reminders, search
from app.config import settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.services.seed_service import seed_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure data directories exist.
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    # Create tables.
    Base.metadata.create_all(bind=engine)
    # Seed demo data so the product is explorable immediately.
    if settings.SEED_DEMO_DATA:
        db = SessionLocal()
        try:
            seed_demo_data(db)
        finally:
            db.close()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="RentWise — AI Rental Document Assistant API",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(comparison.router, prefix=settings.API_V1_PREFIX)
app.include_router(documents.router, prefix=settings.API_V1_PREFIX)
app.include_router(chat.router, prefix=settings.API_V1_PREFIX)
app.include_router(search.router, prefix=settings.API_V1_PREFIX)
app.include_router(reminders.router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["health"])
def root() -> dict:
    return {
        "name": settings.APP_NAME,
        "status": "ok",
        "demo": settings.is_demo,
    }


@app.get("/health", tags=["health"])
def health() -> dict:
    return {"status": "ok"}
