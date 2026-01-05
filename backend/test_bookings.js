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
  console.log('Testing bookings endpoints...');
  let server;
  try {
    server = await startServer();
    const base = `http://localhost:${server.port}`;

    console.log('\nPOST /api/bookings');
    const resp = await fetch(`${base}/api/bookings`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ worker_id: 1, customer_name:'Test Customer', customer_phone:'9000000000'}) });
    console.log('status', resp.status);
    const body = await resp.json();
    console.log(JSON.stringify(body, null, 2));
    if (!resp.ok) throw new Error('create booking failed');

    const bookingId = body.booking && body.booking.id;
    if (!bookingId) throw new Error('no booking id returned');

    // Connect WebSocket client, wait for 'connected', then POST update and await location message
    const WebSocket = require('ws');
    const ws = new WebSocket(`ws://localhost:${server.port}/ws/bookings/${bookingId}`);

    const waitFor = (type, timeoutMs = 7000) => new Promise((resolve, reject) => {
      const t = setTimeout(() => { reject(new Error('Timeout waiting for ' + type)); }, timeoutMs);
      const onmsg = (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === type) { clearTimeout(t); ws.off('message', onmsg); return resolve(msg); }
        } catch (e) {}
      };
      ws.on('message', onmsg);
      ws.on('error', (err) => { clearTimeout(t); ws.off('message', onmsg); reject(err); });
    });

    // wait connected
    await waitFor('connected');
    // small delay to ensure server has registered client before update broadcast
    await new Promise(r => setTimeout(r, 100));

    // prepare to capture location message BEFORE posting update (avoid race)
    const locationPromise = waitFor('location', 7000);

    console.log(`\nPOST /api/bookings/${bookingId}/update-location`);
    const resp2 = await fetch(`${base}/api/bookings/${bookingId}/update-location`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ lat: 17.0, lng: 80.0, status:'enroute', eta_minutes: 10 }) });
    console.log('status', resp2.status);
    const b2 = await resp2.json();
    console.log(JSON.stringify(b2, null, 2));
    if (!resp2.ok) throw new Error('update location failed');

    // wait for websocket location message
    const wsMsg = await locationPromise;
    console.log('\nReceived WS message:');
    console.log(JSON.stringify(wsMsg, null, 2));

    ws.close();

    console.log('\nGET /api/bookings/' + bookingId);
    const resp3 = await fetch(`${base}/api/bookings/${bookingId}`);
    console.log('status', resp3.status);
    console.log(JSON.stringify(await resp3.json(), null, 2));

    console.log('\nBookings endpoint tests passed.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    if (server && server.proc) server.proc.kill('SIGINT');
  }
})();