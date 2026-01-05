const express = require("express");
const cors = require("cors");
const path = require("path");
// Load environment variables from .env (optional, for local dev)
require('dotenv').config();
const pool = require("./db");
const { WebSocketServer } = require('ws'); // websockets for live tracking

// Top-level websocket server and subscriptions (so endpoints can broadcast to clients)
const wss = new WebSocketServer({ noServer: true });
const bookingClients = new Map(); // bookingId -> Set(ws)
function broadcastBooking(bookingId, payload) {
  const key = String(bookingId);
  const set = bookingClients.get(key);
  console.log('Broadcasting to booking', key, 'clients:', set ? set.size : 0);
  if (!set) return;
  const msg = JSON.stringify(payload);
  for (const c of set) {
    if (c.readyState === c.OPEN) {
      try { c.send(msg); } catch (e) { /* ignore send errors */ }
    }
  }
}

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, "../frontend")));

// API: get workers
app.get("/api/workers", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM workers ORDER BY experience DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: add worker (registration)
app.post("/api/add-worker", async (req, res) => {
  const { name, skill, city, phone, experience, category } = req.body || {};

  // Basic validation
  if (!name || !skill || !city || !phone) {
    return res.status(400).json({ error: "Missing required fields: name, skill, city, phone" });
  }

  // Parse experience (accepts strings like '5 Years' or numbers)
  let expNum = null;
  if (experience !== undefined && experience !== null && String(experience).trim() !== "") {
    const m = String(experience).match(/\d+/);
    const parsed = m ? parseInt(m[0], 10) : NaN;
    expNum = Number.isNaN(parsed) ? null : parsed;
  }

  const is_woman = (category && String(category).toLowerCase() === "women") || (category && String(category).toLowerCase() === "woman");

  try {
    const result = await pool.query(
      "INSERT INTO workers (name, skill, city, experience, phone, is_woman) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [name, skill, city, expNum, phone, is_woman]
    );

    const worker = result.rows[0];
    // compatibility helper used by some pages
    worker.exp = worker.experience ? `${worker.experience} years` : "";

    res.json({ success: true, worker });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: search
app.get("/api/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  try {
    if (!q) {
      const result = await pool.query("SELECT id, name, skill, city, experience, phone, is_woman FROM workers ORDER BY experience DESC");
      const rows = result.rows.map(r => ({ ...r, exp: r.experience ? `${r.experience} years` : "" }));
      return res.json(rows);
    }

    if (q.toLowerCase().includes("woman")) {
      const result = await pool.query("SELECT id, name, skill, city, experience, phone, is_woman FROM workers WHERE is_woman = true ORDER BY experience DESC");
      const rows = result.rows.map(r => ({ ...r, exp: r.experience ? `${r.experience} years` : "" }));
      return res.json(rows);
    }

    const term = `%${q}%`;
    const result = await pool.query(
      "SELECT id, name, skill, city, experience, phone, is_woman FROM workers WHERE name ILIKE $1 OR skill ILIKE $1 OR city ILIKE $1 ORDER BY experience DESC",
      [term]
    );

    const rows = result.rows.map(r => ({ ...r, exp: r.experience ? `${r.experience} years` : "" }));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Home page — redirect to landing page
app.get("/", (req, res) => {
  // Landing page is served statically at /landing.html
  res.redirect('/landing.html');
});

// API: get worker by id
app.get('/api/workers/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    const result = await pool.query('SELECT id, name, skill, city, experience, phone, is_woman FROM workers WHERE id = $1', [id]);
    if (!result || result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const r = result.rows[0];
    r.exp = r.experience ? `${r.experience} years` : '';
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Bookings endpoints ----

// helper: check if a column exists on a table (cached)
const _colCache = new Map();
async function hasColumn(table, column) {
  const key = `${table}.${column}`;
  if (_colCache.has(key)) return _colCache.get(key);
  try {
    const r = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND column_name=$2", [table, column]);
    const ok = r && r.rows && r.rows.length > 0;
    _colCache.set(key, ok);
    return ok;
  } catch (e) {
    return false;
  }
}

// Create a booking: POST /api/bookings
app.post('/api/bookings', async (req, res) => {
  const { worker_id, customer_name, customer_phone } = req.body || {};
  if (!worker_id) return res.status(400).json({ error: 'Missing required field: worker_id' });

  // verify worker exists
  try {
    const w = await pool.query('SELECT id FROM workers WHERE id = $1', [worker_id]);
    if (!w || w.rows.length === 0) return res.status(400).json({ error: 'Worker not found' });

    // prefer to insert into (worker_id, customer_name, customer_phone) if columns exist
    if (await hasColumn('bookings', 'customer_name') && await hasColumn('bookings', 'customer_phone')) {
      const result = await pool.query(
        'INSERT INTO bookings (worker_id, customer_name, customer_phone) VALUES ($1,$2,$3) RETURNING *',
        [worker_id, customer_name || null, customer_phone || null]
      );
      return res.status(201).json({ booking: result.rows[0] });
    }

    // Fallback for older schema (worker_id + date/time)
    const fallback = await pool.query('INSERT INTO bookings (worker_id, date, time) VALUES ($1, CURRENT_DATE, CURRENT_TIME) RETURNING *', [worker_id]);
    return res.status(201).json({ booking: fallback.rows[0], note: 'Inserted using fallback schema (date/time)' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get booking details: GET /api/bookings/:id
app.get('/api/bookings/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (!result || result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ booking: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ensure bookings have location columns (adds them if missing)
async function ensureBookingLocationColumns() {
  try {
    if (!await hasColumn('bookings', 'current_lat')) {
      await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS current_lat DOUBLE PRECISION');
      _colCache.set('bookings.current_lat', true);
    }
    if (!await hasColumn('bookings', 'current_lng')) {
      await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS current_lng DOUBLE PRECISION');
      _colCache.set('bookings.current_lng', true);
    }
    if (!await hasColumn('bookings', 'eta_minutes')) {
      await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS eta_minutes INT');
      _colCache.set('bookings.eta_minutes', true);
    }
    if (!await hasColumn('bookings', 'status')) {
      await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'pending'");
      _colCache.set('bookings.status', true);
    }
    if (!await hasColumn('bookings', 'updated_at')) {
      await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()');
      _colCache.set('bookings.updated_at', true);
    }
    // create history table if not exists
    if (!await hasColumn('booking_location_history', 'lat')) {
      await pool.query(`CREATE TABLE IF NOT EXISTS booking_location_history (
        id SERIAL PRIMARY KEY,
        booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        recorded_at TIMESTAMP DEFAULT NOW()
      )`);
      _colCache.set('booking_location_history.lat', true);
    }
  } catch (e) {
    // ignore—best-effort migration
    console.warn('Could not ensure location columns:', e.message);
  }
}

// Update booking location/status: POST /api/bookings/:id/update-location
app.post('/api/bookings/:id/update-location', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });

  const { lat, lng, status, eta_minutes } = req.body || {};

  console.log('update-location called for', id, req.body);

  // attempt to ensure DB has necessary columns (best-effort)
  await ensureBookingLocationColumns();

  if (!(await hasColumn('bookings', 'current_lat') && await hasColumn('bookings', 'current_lng'))) {
    return res.status(400).json({ error: 'Bookings table does not support location updates in this DB schema' });
  }

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Missing lat/lng' });
  }

  try {
    const update = await pool.query(
      'UPDATE bookings SET current_lat=$1, current_lng=$2, status=$3, eta_minutes=$4, updated_at=NOW() WHERE id=$5 RETURNING *',
      [lat, lng, status || null, eta_minutes || null, id]
    );

    if (!update || update.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });

    // store history if table exists
    if (await hasColumn('booking_location_history', 'lat')) {
      try {
        await pool.query('INSERT INTO booking_location_history (booking_id, lat, lng) VALUES ($1,$2,$3)', [id, lat, lng]);
      } catch (e) {
        // ignore history failures
      }
    }

    console.log('after update, will broadcast for', id);

    // Broadcast location update to connected websocket clients for this booking
    try {
      broadcastBooking(id, { type: 'location', booking_id: id, lat, lng, status, eta_minutes });
    } catch (e) { /* ignore broadcast errors */ }

    res.json({ booking: update.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server with port fallback on EADDRINUSE
const startPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const MAX_RETRIES = 10;

// Debug: capture uncaught exceptions and unhandled rejections
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT_EXCEPTION', err);
  // keep process alive long enough for logs to flush
  setTimeout(() => process.exit(1), 100);
});
process.on('unhandledRejection', (reason, p) => {
  console.error('UNHANDLED_REJECTION', reason);
});

function startServer(port, attemptsLeft = MAX_RETRIES) {
  const server = app.listen(port, () => {
    const actualPort = server.address && server.address().port ? server.address().port : port;
    console.log(`✅ Server running at http://localhost:${actualPort}`);
  });

  server.on('upgrade', (request, socket, head) => {
    // only handle booking websocket paths
    if (!request.url || !request.url.startsWith('/ws/bookings/')) { socket.destroy(); return; }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws, request) => {
    const m = request.url.match(/^\/ws\/bookings\/(\d+)/);
    if (!m) { ws.close(); return; }
    const bookingId = m[1];
    console.log('WS connected for booking', bookingId, 'from', request.socket.remoteAddress);
    if (!bookingClients.has(bookingId)) bookingClients.set(bookingId, new Set());
    bookingClients.get(bookingId).add(ws);

    ws.on('close', () => {
      console.log('WS closed for booking', bookingId);
      bookingClients.get(bookingId)?.delete(ws);
      if (bookingClients.get(bookingId)?.size === 0) bookingClients.delete(bookingId);
    });

    ws.on('message', () => {
      // No-op: we don't expect messages from clients now
    });

    ws.send(JSON.stringify({ type: 'connected', booking_id: bookingId }));
  });

  // Close websockets on shutdown
  const originalShutdown = global.__wss_shutdown_added;
  if (!originalShutdown) {
    global.__wss_shutdown_added = true;
    const oldShutdown = process.listeners('SIGINT').slice();
    process.on('SIGINT', () => {
      try { wss.close(); } catch (e) {}
    });
  }

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is in use. ${attemptsLeft > 0 ? 'Trying next port...' : 'No retries left.'}`);
      try {
        server.close();
      } catch (e) {
        // ignore
      }
      if (attemptsLeft > 0) {
        return startServer(port + 1, attemptsLeft - 1);
      }
      console.error(`Unable to bind to a port after ${MAX_RETRIES} attempts. Exiting.`);
      process.exit(1);
    }

    console.error('Server error:', err);
    process.exit(1);
  });

  // Graceful shutdown: close server and DB pool
  const shutdown = (signal) => {
    console.log(`Shutting down server... signal=${signal}`);
    console.log(new Error('shutdown-stack').stack);
    // print active handles count for debugging
    try {
      const handles = process._getActiveHandles ? process._getActiveHandles().length : 'unknown'
      console.log('Active handles:', handles);
    } catch (e) {
      // ignore
    }

    server.close(() => {
      pool.end(() => {
        console.log('DB pool closed. Exiting.');
        process.exit(0);
      });
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('exit', (code) => console.log('Process exit event, code=', code));
}

startServer(startPort);
