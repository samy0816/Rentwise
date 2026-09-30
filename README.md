# RentWise — AI Rental Document Assistant

RentWise helps renters understand complicated rental documents by transforming
contracts and related documents into clear, actionable information.

Instead of forcing users to read long and complicated documents, RentWise
**extracts what matters** — money, dates, obligations and clauses worth
reviewing — and provides a conversational interface where users can ask
questions **grounded in their own documents**, with the source always shown.

> RentWise provides informational assistance and is **not** a substitute for
> professional legal advice.

---

## Why I built it

Rental documents in Germany are written in legal German that is hard to parse,
especially for students, young professionals and international renters. RentWise
is built as a genuine **information and decision-support product** — not a
generic "chat with your PDF". The central experience is:

> **Upload your rental documents and immediately understand what actually matters.**

---

## Features

- **Contract overview** — a clear summary of rent, deposit, dates and rules.
- **Important dates** — deadlines, notice periods and reminders surfaced early.
- **Money breakdown** — rent, utilities, deposit and one-time costs.
- **Clause explanations** — the **✨ Explain this** feature rewrites complex
  passages in plain, simple language.
- **AI Q&A** — ask anything; answers are grounded in your documents.
- **Source references** — every answer shows the document, page and section.
- **Document comparison** — see what changed between an old and a new contract.
- **Smart search** — semantic search across all your documents.
- **Reminders** — keep track of deadlines.
- **English + German** — the UI supports both; document language is preserved.
- **Demo mode** — a seeded demo account means recruiters can explore the whole
  product without uploading a single PDF.

---

## Architecture

```
┌────────────────────────┐        ┌────────────────────────────┐
│   Next.js frontend      │  HTTP  │   FastAPI backend           │
│   App Router, Tailwind  │ ─────► │   modular services + AI      │
│   shadcn/ui, RSC/CSR    │        │   Pydantic, SQLAlchemy      │
└────────────────────────┘        └──────────────┬───────────────┘
                                                 │
                                        ┌────────▼────────┐
                                        │  PostgreSQL      │
                                        │  + pgvector     │
                                        │  (SQLite in      │
                                        │   demo mode)     │
                                        └─────────────────┘
```

### RAG pipeline

```
PDF
 ↓
Text extraction (pypdf / pdfplumber)
 ↓
Document classification (LLM / keyword)
 ↓
Chunking (LangChain RecursiveCharacterTextSplitter, page-aware)
 ↓
Embeddings (Gemini / OpenAI, or local deterministic model)
 ↓
vec storage (pgvector in prod, JSON + cosine in demo)
 ↓
Retriever (semantic + lexical boost, user-scoped)
 ↓
LLM (Gemini / OpenAI, or grounded demo answer builder)
 ↓
Grounded answer + source citations
```

The code deliberately keeps one code path that works in demo mode (SQLite,
local embeddings, a conservative grounded answer builder) and in production
(PostgreSQL + pgvector + a Gemini or OpenAI LLM) — so the product is always
demo-able.

---

## Tech stack

| Layer      | Technology                                                        |
| ---------- | ----------------------------------------------------------------- |
| Frontend   | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Lucide |
| Backend    | Python, FastAPI, Pydantic v2, SQLAlchemy 2.0                      |
| AI         | LangChain, RAG, embeddings, structured extraction                 |
| Database   | PostgreSQL + pgvector (SQLite fallback for demo)                  |
| Auth       | JWT (python-jose), bcrypt                                         |
| Docs       | pypdf / pdfplumber for PDF text extraction                        |

---

## Local setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows
pip install -r requirements.txt

# Copy the env file (demo mode is on by default — no external services needed)
copy .env.example .env

# Run the API
uvicorn app.main:app --reload --port 8000
```

Demo mode uses SQLite, a deterministic local embedding model and a grounded
answer builder, so the entire product works **without** a PostgreSQL instance,
a pgvector extension or an API key.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

### Demo account

- **Email:** `demo@rentwise.app`
- **Password:** `demo1234`

The demo account is pre-loaded with a sample apartment ("My Apartment",
Hamburg), a German rental contract, a utility statement and a landlord letter —
fully processed with extracted rent, deposit, insights, reminders and chat
answers.

---

## Environment variables

### Backend (`backend/.env`)

| Variable                | Description                                          |
| ----------------------- | ---------------------------------------------------- |
| `DATABASE_URL`          | `postgresql+psycopg2://...` or `sqlite:///...`       |
| `SECRET_KEY`            | Long random string used to sign JWTs                 |
| `DEMO_MODE`             | `true` to run locally without external services      |
| `AI_PROVIDER`           | `auto` (default), `demo`, `openai` or `google`       |
| `SEED_DEMO_DATA`        | `true` to seed the demo account on startup           |
| `GEMINI_API_KEY`        | Enables Google Gemini embeddings + LLM responses     |
| `GEMINI_MODEL`          | e.g. `gemini-2.0-flash`                              |
| `GEMINI_EMBEDDING_MODEL`| e.g. `models/gemini-embedding-2`                    |
| `OPENAI_API_KEY`        | Alternative LLM provider (OpenAI)                    |
| `OPENAI_MODEL`          | LLM model (e.g. `gpt-4o-mini`)                       |
| `OPENAI_EMBEDDING_MODEL`| Embedding model (e.g. `text-embedding-3-small`)      |
| `CORS_ORIGINS`          | Comma-separated list (default `http://localhost:3000`)|

`AI_PROVIDER` is `auto` by default: it uses **Gemini** if `GEMINI_API_KEY` is
set, otherwise **OpenAI** if `OPENAI_API_KEY` is set, otherwise it falls back
to the fully-local demo mode.

### Frontend (`frontend/.env.local`)

| Variable               | Description                    |
| ---------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_URL`  | Backend base URL (default `http://localhost:8000`) |

---

## Connecting PostgreSQL + Gemini

The app runs in demo mode (SQLite + local grounding) out of the box. To use a
real database and Gemini, do the following.

### 1. PostgreSQL + pgvector

The code is already PostgreSQL-ready; tables are created automatically on
startup. You only need a running instance and the connection string.

```bash
# Create the database + user (adjust credentials to your setup)
psql -U postgres -c "CREATE USER rentwise WITH PASSWORD 'rentwise';"
psql -U postgres -c "CREATE DATABASE rentwise OWNER rentwise;"

# Enable pgvector (optional but recommended for native vector search)
psql -U postgres -d rentwise -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

Then set `DATABASE_URL` in `backend/.env`:

```
DATABASE_URL=postgresql+psycopg2://rentwise:rentwise@localhost:5432/rentwise
```

> **Note:** Embeddings are stored portably (JSON + cosine similarity in
> Python), so the app works with or without the `pgvector` extension. The
> extension enables native SQL vector search, while the Python path is used
> when pgvector isn't installed.

### 2. Gemini

Add your key to `backend/.env`:

```
GEMINI_API_KEY=your-google-ai-key
GEMINI_MODEL=gemini-2.0-flash
GEMINI_EMBEDDING_MODEL=models/gemini-embedding-2
AI_PROVIDER=auto
```

The backend will automatically switch from demo mode to the Google provider
(the `/` and `/health` endpoints report `"demo": false`).

> **Note:** Some accounts don't have access to `models/text-embedding-004`.
> If you get a `404 ... text-embedding-004 is not found`, switch the embedding
> model to `models/gemini-embedding-2` (or list available models with the
> `google.generativeai` SDK).

### 3. Restart the backend

```bash
uvicorn app.main:app --reload --port 8000
```

---

## API documentation

FastAPI auto-generates interactive docs at **`http://localhost:8000/docs`**.

| Method | Endpoint                 | Description                          |
| ------ | ------------------------ | ------------------------------------ |
| POST   | `/auth/register`         | Create an account                    |
| POST   | `/auth/login`            | Log in, returns a JWT                |
| GET    | `/auth/me`               | Current user                         |
| POST   | `/documents/upload`      | Upload + process a PDF               |
| GET    | `/documents`             | List the user's documents            |
| GET    | `/documents/{id}`        | Document detail                      |
| GET    | `/documents/{id}/overview` | Contract overview                  |
| GET    | `/documents/{id}/insights` | Important clauses                  |
| GET    | `/documents/{id}/content` | Page-text for the viewer            |
| POST   | `/documents/{id}/process` | Re-process a document               |
| DELETE | `/documents/{id}`        | Delete a document                    |
| POST   | `/chat`                  | Ask across all documents (RAG)       |
| POST   | `/documents/{id}/chat`   | Ask within one document (RAG)        |
| POST   | `/ai/explain`            | Plain-language explanation           |
| GET    | `/search?q=`             | Smart search                         |
| POST   | `/documents/compare`     | Compare two documents                |
| GET    | `/reminders`             | List reminders                       |
| POST   | `/reminders`             | Create a reminder                    |
| DELETE | `/reminders/{id}`        | Delete a reminder                    |

---

## Testing

```bash
# Backend
cd backend
$env:PYTHONPATH="."
.venv\Scripts\python.exe -m pytest tests -q
```

The backend test suite covers:

- **Authentication** — registration, login, duplicate email, wrong password,
  token requirements.
- **Permissions** — the critical rule: **one user cannot access another
  user's documents** (all document endpoints return `404` for non-owners).
- **Extraction** — heuristic structured extraction of rent / utilities /
  deposit / contract type / notice period.
- **RAG** — the retriever surfaces the relevant chunk; the chat endpoint
  returns grounded answers with sources and handles empty/document-less cases.

Frontend is verified end-to-end in **demo mode** (login, dashboard, document
viewer, smart search, chat with source citations, compare, settings) — see the
QA flows in the demo account.

---

## Project structure

```
Rentwise/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app + wiring
│   │   ├── api/               # endpoints (auth, documents, chat, search, comparison, reminders)
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # document processing, extraction, RAG, comparison, seed
│   │   ├── ai/                # embeddings, retriever, LLM providers, prompts
│   │   ├── core/              # security (JWT, bcrypt)
│   │   └── db/                # session, base, types
│   ├── tests/                 # pytest suite
│   └── requirements.txt
├── frontend/
│   ├── app/                   # Next.js App Router pages (landing, auth, dashboard, docs, ask, compare, settings)
│   ├── components/            # shadcn/ui + product components
│   └── lib/                   # api client, types, auth context, i18n, demo data
└── README.md
```

---

## Limitations

- **OCR is not implemented.** Scanned / image-only PDFs are detected and
  reported as unsupported; only text-based PDFs are processed.
- **Demo mode** uses a deterministic embedding model and a conservative
  rule-based answer builder. For the richest answers, set `GEMINI_API_KEY`
  (or `OPENAI_API_KEY`) and configure PostgreSQL + pgvector.
- The structured extraction heuristics are tuned for typical German rental
  contracts; unusual document layouts may yield partial results.
- The comparison service focuses on deterministic field-level diffs plus
  notes; it does not perform deep clause-level semantic comparison.

## Future improvements

- OCR support for scanned documents.
- Email / push reminders.
- Verified legal-knowledge source for (careful) validity claims.
- More granular clause-level comparison with LLM assistance.
- Better cross-language retrieval for German↔English queries.
