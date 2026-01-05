


# Copilot / AI agent instructions for LocalTalent

## TL;DR ✅
- Two backends: **Node (Express)** in `backend/` (serves `frontend/` static files, default port 5000) and **FastAPI (Python)** in `python-backend/` (default port 8000). Both expose the Workers APIs; the Python service mirrors the Node workers API and provides bookings + WebSocket support.
- DB: PostgreSQL seeded by `database.sql`. Booking schema/migration: `database/migrations/001_create_bookings.sql`.

---

## First things to do (quick wins) 🔧
1. Run the Postgres seed and start both backends locally. Confirm smoke tests for both pass:
   - Node: `node backend/test_api.js` (spawns server on ephemeral port; requires Node 18+).
   - Python: `python python-backend/smoke_test.py` (run while FastAPI is running on :8000).
2. Use `.env` (examples at root and `python-backend/.env.example`). Never commit secrets — the project expects env vars like `PGUSER`, `PGPASSWORD`, `PGHOST`, `PGDATABASE`, `PGPORT`, and `PORT`.
3. Preserve API compatibility: keep `experience` (number) in responses and the `exp` string used by the frontend (e.g., "3 years").

---

## Important project specifics (read before editing code) ⚠️
- DB defaults: `backend/db.js` and `python-backend` load env vars and fall back to `postgres/postgres@localhost:5432/local_talent` by default. Change `PGPASSWORD` locally if needed — do not hard-code credentials.
- Auto-migration (Node): `backend/server.js` will attempt a best-effort migration to add booking location columns (`current_lat`, `current_lng`, `eta_minutes`, `status`, `updated_at`) and will create `booking_location_history` if missing. This is intentional and non-invasive but **tests should account for both old and new schemas**.
- WebSockets: both servers expose `/ws/bookings/{id}` that broadcast JSON messages of type `location`. The front-end `frontend/booking.js` connects by default to `${location.hostname}:8000`, but you can override the host with `window.BOOKING_WS_URL` (used by deployments with a separate WS host).
- Port behavior: Node server tries to bind `PORT` and will increment on EADDRINUSE (up to 10 retries) — tests rely on the server printing `Server running at http://localhost:<port>` (the spawn-based smoke tests read that log line to detect readiness).
- Field mapping: worker objects include `is_woman` (bool) and `exp` (string) for compatibility. Do not remove or rename these without updating the UI and tests.
- Running both backends against the same DB will create duplicate entries — avoid this during tests unless intentional.

---

## Tests & examples (copy-paste) 📋
- DB quick setup:
  - psql -U postgres -c "CREATE DATABASE local_talent;"
  - psql -U postgres -d local_talent -f database.sql
- Node (local):
  - cd backend && npm install
  - npm start
  - Run smoke tests: `node backend/test_api.js`
- Python (local):
  - python -m venv .venv && .venv\Scripts\activate
  - pip install -r python-backend/requirements.txt
  - cd python-backend && uvicorn main:app --host 0.0.0.0 --port 8000
  - Run smoke tests: `python python-backend/smoke_test.py`
- Curl examples:
  - POST worker: `curl -X POST http://localhost:5000/api/add-worker -H "Content-Type: application/json" -d '{"name":"Test","skill":"Carpentry","city":"Narasaraopet","phone":"9999999999","experience":3,"category":"Women"}'`
  - Search: `curl "http://localhost:5000/api/search?q=woman"`

---

## Where to look (quick file map) 🔎
- Node API and behavior: `backend/server.js` (endpoints, WebSocket broadcast, auto-migration), `backend/db.js` (PG connection), and test helpers: `backend/test_api.js`, `backend/test_bookings.js`, `backend/test_worker_detail.js`.
- Python API: `python-backend/main.py` and `python-backend/smoke_test.py` (mirrors endpoints + WS implementation).
- DB schema & migrations: `database.sql`, `database/migrations/001_create_bookings.sql`.
- Frontend integration: `frontend/booking.js` (WS connection and location simulation), `frontend/*.html` pages.

---

## When to ask for help / open a PR 🧭
- If you need to change any public API shape (e.g., remove `exp`, rename fields) — open an explicit PR and update both backends + frontend + tests.
- For schema migrations: prefer adding explicit SQL migration in `database/migrations/` rather than relying on runtime auto-migrations for major changes.
- If you find flaky tests related to ports or WS timing, update smoke tests to be robust (they rely on log detection and WebSocket messages).

---

If you'd like, I can (A) condense to a one-page quick-start, (B) add PR-ready code snippets (env, SQL, tests), or (C) open a PR with follow-up improvements — which do you prefer?