import Head from 'next/head'
import Link from 'next/link'

export default function Home() {
  return (
    <>
      <Head>
        <title>Local Talent — Landing</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>

      <header className="hero">
        <div className="wrap">
          <h1>Local Talent</h1>
          <p className="lead">A tiny service to find local workers — Node + static frontend, optional FastAPI backend for bookings.</p>
          <p className="cta">
            <Link href="/intro"><a className="btn">Open App</a></Link>
            <Link href="/women"><a className="btn alt">Women</a></Link>
            <Link href="/booking"><a className="btn alt">Bookings</a></Link>
          </p>
        </div>
      </header>

      <main className="wrap grid">
        <section>
          <h2>Quick start</h2>
          <pre><code>{`# DB (Postgres)
psql -U postgres -c "CREATE DATABASE local_talent;"
psql -U postgres -d local_talent -f database.sql

# Node backend (serves frontend)
cd backend
npm install
npm start  # server at http://localhost:5000/

# Python backend (bookings + websockets)
python -m venv .venv
.venv\Scripts\activate
pip install -r python-backend/requirements.txt
cd python-backend
uvicorn main:app --host 0.0.0.0 --port 8000`}</code></pre>
          <p>Smoke tests: <code>node backend/test_api.js</code> and <code>python python-backend/smoke_test.py</code></p>
        </section>

        <section>
          <h2>Key files</h2>
          <ul>
            <li><code>backend/server.js</code> — Express API and static server</li>
            <li><code>backend/db.js</code> — PG pool (dotenv)</li>
            <li><code>python-backend/main.py</code> — FastAPI service (bookings, WebSocket)</li>
            <li><code>database.sql</code> / <code>database/migrations/</code> — DB schema</li>
            <li><code>frontend/*.html</code> — static pages</li>
          </ul>
        </section>

        <section>
          <h2>Developer notes</h2>
          <ul>
            <li>Use <code>.env.example</code> to create a local <code>.env.local</code> for DB creds.</li>
            <li>Booking frontend uses WebSocket on port <code>:8000</code> (python backend).</li>
          </ul>
        </section>
      </main>

      <footer className="wrap small">
        <p>Files added: <code>/frontend/landing.html</code>, <code>/frontend/landing.css</code> — tell me if you want a nav link added to the main pages.</p>
      </footer>
    </>
  )
}
