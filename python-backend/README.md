# Local Talent — Python Backend (FastAPI)

This service mirrors the Node/Express API and provides the same endpoints:
- GET /api/workers
- POST /api/add-worker
- GET /api/search?q=...

Quick start (using python + venv)

1. python -m venv .venv
2. .venv\Scripts\activate (Windows) or source .venv/bin/activate
3. pip install -r requirements.txt (or use poetry install if using poetry)
4. Copy `.env.example` to `.env` and edit DB connection if necessary
5. uvicorn main:app --host 0.0.0.0 --port 8000

Smoke test

- python smoke_test.py

Notes

- The service connects to the same Postgres DB as the Node server. It does not modify the DB schema (uses `workers` table). Be careful when running both servers pointing to same DB to avoid duplicate inserts.