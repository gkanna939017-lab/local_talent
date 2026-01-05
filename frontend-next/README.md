# Local Talent — Next.js frontend

This is a minimal Next.js frontend scaffold for the Local Talent project.

Quick start:

- Install dependencies:
  - cd frontend-next
  - npm install
- Run dev server:
  - npm run dev (http://localhost:3000)

Notes:
- By default the sample `/api/workers` endpoint returns dummy data. To proxy to the existing Node backend, set `LEGACY_API_URL` in `.env.local`.
- The Python backend (bookings & WebSocket) is left as a separate service and can be pointed to with `PYTHON_BACKEND_URL`.

Next steps:
- Convert the remaining static pages (`intro.html`, `booking.html`, `women.html`) to Next pages and wire API routes to Postgres.
- Add DB migrations and a `pg`-backed API route for production reads/writes.
- Add CI + Vercel/GitHub Actions config for deploy.
