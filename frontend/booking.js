// Booking demo removed — script neutralized by request.
// No operations are performed here anymore.

  let ws = null;
  let simInterval = null;
  let lastLat = 17.0, lastLng = 80.0; // starting point for simulation

  // Prefill worker id from URL query (e.g. /booking.html?worker_id=5)
  (function prefillFromQuery(){
    try {
      const params = new URLSearchParams(location.search);
      const wid = params.get('worker_id');
      if (wid) {
        const inEl = document.getElementById('worker_id');
        inEl.value = wid;
        // Attempt to fetch worker details for better UX
        fetch(`/api/workers/${encodeURIComponent(wid)}`).then(r => {
          if (!r.ok) return;
          return r.json();
        }).then(data => {
          if (!data) return;
          const h = document.createElement('p');
          h.innerHTML = `<strong>Worker:</strong> ${data.name} — <em>${data.skill}</em>`;
          const form = document.getElementById('booking_form');
          form.insertAdjacentElement('beforebegin', h);
        }).catch(() => {});
      }
    } catch (e) {
      // ignore
    }
  })();

  function log(msg){
    const t = new Date().toLocaleTimeString();
    logEl.textContent = `${t} — ${msg}\n` + logEl.textContent;
  }

  async function createBooking(e){
    e.preventDefault();
    const worker_id = parseInt(document.getElementById('worker_id').value,10);
    const customer_name = document.getElementById('cust_name').value.trim();
    const customer_phone = document.getElementById('cust_phone').value.trim();
    if (!worker_id) { alert('Enter worker id'); return; }

    // Validate worker exists before attempting to create a booking (better UX)
    try {
      const wr = await fetch(`/api/workers/${worker_id}`);
      if (wr.status === 404) { alert('Worker not found'); return; }
      if (!wr.ok) { alert('Error verifying worker'); return; }
    } catch (err) {
      alert('Error verifying worker: ' + err.message);
      return;
    }

    const res = await fetch('/api/bookings', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({worker_id, customer_name, customer_phone})
    });
    const data = await res.json();
    if (!res.ok) { alert(data.detail || 'Error'); return; }
    const booking = data.booking;
    bookingInfoEl.style.display = 'block';
    bookingIdEl.textContent = booking.id;
    bookingStatusEl.textContent = booking.status;
    if (booking.current_lat && booking.current_lng) {
      bookingLocEl.textContent = `${booking.current_lat}, ${booking.current_lng}`;
      mapsLink.href = `https://www.google.com/maps?q=${booking.current_lat},${booking.current_lng}`;
    }

    connectWS(booking.id);
  }

  function connectWS(bookingId){
    if (ws) { try{ ws.close() } catch(e){} ws = null; }
    const proto = (location.protocol === 'https:') ? 'wss' : 'ws';
    // Support using Python backend on a separate host (BOOKING_WS_URL env on deploy)
    const wsHost = window.BOOKING_WS_URL || `${location.hostname}:8000`;
    const wsUrl = `${proto}://${wsHost}/ws/bookings/${bookingId}`;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      log('WebSocket connection failed: ' + e.message);
      return;
    }
    ws.onopen = () => log('WebSocket connected for booking ' + bookingId);
    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload.type === 'location'){
          bookingStatusEl.textContent = payload.status || bookingStatusEl.textContent;
          bookingLocEl.textContent = `${payload.lat}, ${payload.lng}`;
          mapsLink.href = `https://www.google.com/maps?q=${payload.lat},${payload.lng}`;
          log(`Location update — lat:${payload.lat} lng:${payload.lng} status:${payload.status || ''} eta:${payload.eta_minutes || ''}`);
        } else {
          log('Message: ' + ev.data);
        }
      } catch (err){ log('Invalid message: '+ev.data); }
    };
    ws.onclose = () => log('WebSocket disconnected');
    ws.onerror = (e) => log('WebSocket error');
  }

  async function sendLocation(bookingId, lat, lng, status){
    try{
      const res = await fetch(`/api/bookings/${bookingId}/update-location`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({lat, lng, status, eta_minutes: 5})
      });
      const data = await res.json();
      if (!res.ok) log('Update failed: ' + JSON.stringify(data));
      else log('Posted location: ' + lat + ',' + lng + ' ('+status+')');
    }catch(err){ log('Send error: '+err.message); }
  }

  form.addEventListener('submit', createBooking);

  startSimBtn.addEventListener('click', () => {
    const bookingId = bookingIdEl.textContent;
    if (!bookingId) return alert('Create a booking first');
    startSimBtn.classList.add('hidden'); stopSimBtn.classList.remove('hidden');
    simInterval = setInterval(() => {
      lastLat += (Math.random()-0.5)*0.002;
      lastLng += (Math.random()-0.5)*0.002;
      sendLocation(bookingId, Number(lastLat.toFixed(6)), Number(lastLng.toFixed(6)), 'enroute');
    }, 3000);
  });

  stopSimBtn.addEventListener('click', () => {
    if (simInterval) { clearInterval(simInterval); simInterval = null; }
    startSimBtn.classList.remove('hidden'); stopSimBtn.classList.add('hidden');
  });
})();