// Load environment variables for local development
require('dotenv').config();
let pool;

function makeMockPool() {
  // Very small in-memory mock to allow the app to run without a Postgres server.
  const state = {
    workers: [],
    bookings: [],
    booking_location_history: [],
    nextWorkerId: 1,
    nextBookingId: 1
  };

  return {
    query: async (text, params) => {
      const sql = (text || '').toString();
      try {
        console.debug('[mock-pool] SQL:', sql.replace(/\s+/g, ' ').trim(), 'PARAMS:', params || []);


      // information_schema check (hasColumn)
      if (sql.includes('information_schema.columns')) {
        return { rows: [] };
      }

      // CREATE TABLE / ALTER TABLE statements -> no-op
      if (/^CREATE TABLE|ALTER TABLE/i.test(sql)) return { rows: [] };

      // INSERT INTO workers
      if (/INSERT INTO workers/i.test(sql)) {
        const [name, skill, city, experience, phone, is_woman] = params || [];
        const w = {
          id: state.nextWorkerId++,
          name,
          skill,
          city,
          experience: experience === null ? null : Number(experience),
          phone,
          is_woman: !!is_woman
        };
        state.workers.push(w);
        return { rows: [w] };
      }

      // SELECT workers (all)
      if (/FROM workers/i.test(sql) && /WHERE/i.test(sql) === false) {
        // return list sorted by experience desc
        const rows = state.workers.slice().sort((a,b) => (b.experience||0)-(a.experience||0));
        return { rows };
      }

      // SELECT workers WHERE is_woman = true
      if (/FROM workers/i.test(sql) && /is_woman\s*=\s*true/i.test(sql)) {
        const rows = state.workers.filter(w => w.is_woman).sort((a,b) => (b.experience||0)-(a.experience||0));
        return { rows };
      }

      // SELECT ... WHERE name ILIKE or skill ILIKE or city ILIKE
      if (/ILIKE/i.test(sql)) {
        const term = (params && params[0]) ? params[0].replace(/%/g, '').toLowerCase() : '';
        const rows = state.workers.filter(w => (w.name||'').toLowerCase().includes(term) || (w.skill||'').toLowerCase().includes(term) || (w.city||'').toLowerCase().includes(term));
        return { rows };
      }

      // SELECT id FROM workers WHERE id = $1
      if (/SELECT\s+id\s+FROM\s+workers/i.test(sql)) {
        const id = params && params[0];
        const found = state.workers.find(w => w.id === Number(id));
        return { rows: found ? [{ id: found.id }] : [] };
      }

      // INSERT INTO bookings (worker_id, customer_name, customer_phone)
      if (/INSERT INTO bookings\s*\(/i.test(sql)) {
        // support both signatures by looking at params
        const p = params || [];
        const b = { id: state.nextBookingId++, worker_id: null, customer_name: null, customer_phone: null, date: new Date().toISOString(), time: new Date().toISOString() };
        if (p.length >= 1) b.worker_id = Number(p[0]);
        if (p.length >= 2) b.customer_name = p[1] || null;
        if (p.length >= 3) b.customer_phone = p[2] || null;
        state.bookings.push(b);
        return { rows: [b] };
      }

      // SELECT * FROM bookings WHERE id = $1
      if (/FROM bookings/i.test(sql) && /WHERE\s+id\s*=\s*\$1/i.test(sql)) {
        const id = Number(params && params[0]);
        const b = state.bookings.find(x => x.id === id);
        return { rows: b ? [b] : [] };
      }

      // UPDATE bookings SET ... WHERE id=$5 RETURNING *
      if (/UPDATE\s+bookings/i.test(sql) && /RETURNING/i.test(sql)) {
        const id = Number(params && params[4]);
        const b = state.bookings.find(x => x.id === id);
        if (!b) return { rows: [] };
        // assume params order: lat, lng, status, eta, id
        b.current_lat = params[0];
        b.current_lng = params[1];
        b.status = params[2] || null;
        b.eta_minutes = params[3] || null;
        b.updated_at = new Date().toISOString();
        // add history
        state.booking_location_history.push({ id: state.booking_location_history.length+1, booking_id: id, lat: b.current_lat, lng: b.current_lng, recorded_at: new Date().toISOString() });
        return { rows: [b] };
      }

      } catch (e) {
        console.error('[mock-pool] query error:', e && e.stack ? e.stack : e);
        throw e;
      }
      // Fallback: return empty rows for other queries
      return { rows: [] };
    },
    end: async () => { /* noop */ }
  };
}

try {
  // allow forcing the in-memory mock via env var for local tests
  if (process.env.PG_USE_MOCK === '1' || process.env.PG_USE_MOCK === 'true') {
    console.warn('PG_USE_MOCK detected, using mock DB pool');
    pool = makeMockPool();
  } else {
  const { Pool } = require('pg');
  pool = new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'local_talent',
    password: process.env.PGPASSWORD || 'postgres',
    port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
    // small timeout to fail fast in dev/test when PG isn't available
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 2000
  });

  }
  // quick test connection (but don't await here) — if connection fails later, app will handle
} catch (e) {
  console.warn('pg module not available or failed to initialize, using mock DB pool');
  pool = makeMockPool();
}

module.exports = pool;
