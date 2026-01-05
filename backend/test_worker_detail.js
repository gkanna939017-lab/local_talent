const { spawn } = require('child_process');

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['server.js'], { cwd: __dirname, env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let started = false;
    const timer = setTimeout(() => {
      if (!started) { proc.kill(); reject(new Error('Server did not start')); }
    }, 5000);

    proc.stdout.on('data', (d) => {
      const s = d.toString();
      process.stdout.write(s);
      const m = s.match(/Server running at http:\/\/localhost:(\d+)/);
      if (m && !started) { started = true; clearTimeout(timer); resolve({ proc, port: Number(m[1]) }); }
    });

    proc.stderr.on('data', (d) => process.stderr.write(d.toString()));
    proc.on('exit', (code, sig) => { if (!started) reject(new Error('Server exited early')); });
  });
}

(async () => {
  console.log('Testing worker detail endpoint...');
  let server;
  try {
    server = await startServer();
    const base = `http://localhost:${server.port}`;
    const r = await fetch(`${base}/api/workers/1`);
    console.log('status', r.status);
    try { const d = await r.json(); console.log(JSON.stringify(d, null, 2)); } catch(e){ console.log('no json'); }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    if (server && server.proc) server.proc.kill('SIGINT');
  }
})();