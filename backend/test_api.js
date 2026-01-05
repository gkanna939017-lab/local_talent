// Quick API smoke-test for LocalTalent (self-contained)
// This script spawns the backend server on an ephemeral port, runs smoke tests, then shuts it down.
// Run: `node backend/test_api.js` (requires Node 18+ for global fetch)

const { spawn } = require('child_process');
const path = require('path');

async function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['server.js'], { cwd: __dirname, env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let started = false;
    const timer = setTimeout(() => {
      if (!started) {
        proc.kill();
        reject(new Error('Server did not start in time'));
      }
    }, 5000);

    proc.stdout.on('data', (d) => {
      const s = d.toString();
      process.stdout.write(s);
      const m = s.match(/Server running at http:\/\/localhost:(\d+)/);
      if (m && !started) {
        started = true;
        clearTimeout(timer);
        resolve({ proc, port: Number(m[1]) });
      }
    });

    proc.stderr.on('data', (d) => process.stderr.write(d.toString()));

    proc.on('exit', (code, sig) => {
      if (!started) reject(new Error(`Server exited prematurely: ${code} ${sig}`));
    });
  });
}

async function postWorker(base) {
  const payload = {
    name: "Test User",
    skill: "Carpentry",
    city: "Narasaraopet",
    phone: "9999999999",
    experience: "3",
    category: "Women"
  };

  const res = await fetch(`${base}/api/add-worker`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log('POST /api/add-worker -> status:', res.status);
  console.log(JSON.stringify(data, null, 2));
  return data;
}

async function searchWomen(base) {
  const res = await fetch(`${base}/api/search?q=woman`);
  const data = await res.json();
  console.log('GET /api/search?q=woman -> status:', res.status);
  console.log(`${data.length} records returned`);
  console.log(JSON.stringify(data.slice(0, 5), null, 2));
  return data;
}

(async () => {
  console.log('Running LocalTalent API smoke tests (spawned server)...');
  let server;
  try {
    server = await startServer();
    const base = `http://localhost:${server.port}`;
    await postWorker(base);
    await searchWomen(base);
    console.log('Done.');
  } catch (err) {
    console.error('Error during test:', err);
    process.exit(1);
  } finally {
    if (server && server.proc) {
      console.log('Stopping spawned server...');
      server.proc.kill('SIGINT');
    }
  }
})();