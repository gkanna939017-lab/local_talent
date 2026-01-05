from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import asyncio
import asyncpg
from typing import Optional, List
from dotenv import load_dotenv

load_dotenv()

DATABASE = {
    'user': os.getenv('PGUSER', 'postgres'),
    'password': os.getenv('PGPASSWORD', 'postgres'),
    'database': os.getenv('PGDATABASE', 'local_talent'),
    'host': os.getenv('PGHOST', 'localhost'),
    'port': int(os.getenv('PGPORT', 5432)),
}

app = FastAPI(title="LocalTalent (Python API)")

class WorkerIn(BaseModel):
    name: str
    skill: str
    city: str
    phone: str
    experience: Optional[str] = None
    category: Optional[str] = None

class WorkerOut(BaseModel):
    id: int
    name: str
    skill: str
    city: str
    phone: str
    experience: Optional[int] = None
    is_woman: Optional[bool] = False

async def get_pool():
    if not hasattr(app.state, 'pg_pool'):
        app.state.pg_pool = await asyncpg.create_pool(
            user=DATABASE['user'],
            password=DATABASE['password'],
            database=DATABASE['database'],
            host=DATABASE['host'],
            port=DATABASE['port'],
            min_size=1,
            max_size=5,
        )
    return app.state.pg_pool

@app.on_event('startup')
async def startup():
    await get_pool()

@app.on_event('shutdown')
async def shutdown():
    pool = getattr(app.state, 'pg_pool', None)
    if pool:
        await pool.close()

@app.get('/api/workers', response_model=List[WorkerOut])
async def get_workers():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch('SELECT id, name, skill, city, experience, phone, is_woman FROM workers ORDER BY experience DESC')
        return [dict(r) for r in rows]

@app.post('/api/add-worker')
async def add_worker(w: WorkerIn):
    # validation similar to node app
    if not (w.name and w.skill and w.city and w.phone):
        raise HTTPException(status_code=400, detail='Missing required fields')

    exp_num = None
    if w.experience:
        import re
        m = re.search(r"(\d+)", str(w.experience))
        if m:
            exp_num = int(m.group(1))

    is_woman = False
    if w.category and str(w.category).lower() in ('women', 'woman'):
        is_woman = True

    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'INSERT INTO workers (name, skill, city, experience, phone, is_woman) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, skill, city, experience, phone, is_woman',
            w.name, w.skill, w.city, exp_num, w.phone, is_woman
        )
        return {'success': True, 'worker': dict(row)}

@app.get('/api/search')
async def search(q: Optional[str] = None):
    pool = await get_pool()
    if not q or q.strip() == '':
        async with pool.acquire() as conn:
            rows = await conn.fetch('SELECT id, name, skill, city, experience, phone, is_woman FROM workers ORDER BY experience DESC')
            return [dict(r) for r in rows]

    q_lower = q.lower()
    async with pool.acquire() as conn:
        if 'woman' in q_lower:
            rows = await conn.fetch("SELECT id, name, skill, city, experience, phone, is_woman FROM workers WHERE is_woman = true ORDER BY experience DESC")
            return [dict(r) for r in rows]
        term = f"%{q}%"
        rows = await conn.fetch("SELECT id, name, skill, city, experience, phone, is_woman FROM workers WHERE name ILIKE $1 OR skill ILIKE $1 OR city ILIKE $1 ORDER BY experience DESC", term)
        return [dict(r) for r in rows]


# ---- Bookings and live tracking ----
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import Field
from collections import defaultdict
import json

class BookingIn(BaseModel):
    worker_id: int
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None

class BookingOut(BaseModel):
    id: int
    worker_id: Optional[int]
    customer_name: Optional[str]
    customer_phone: Optional[str]
    status: str
    created_at: Optional[str]
    updated_at: Optional[str]
    current_lat: Optional[float]
    current_lng: Optional[float]
    eta_minutes: Optional[int]

class LocationUpdate(BaseModel):
    lat: float = Field(...)
    lng: float = Field(...)
    status: Optional[str] = None
    eta_minutes: Optional[int] = None

# simple in-memory registry of websocket subscribers per booking
if not hasattr(app.state, 'booking_subscribers'):
    app.state.booking_subscribers = defaultdict(set)  # booking_id -> set of WebSocket

@app.post('/api/bookings')
async def create_booking(b: BookingIn):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'INSERT INTO bookings (worker_id, customer_name, customer_phone) VALUES ($1,$2,$3) RETURNING id, worker_id, customer_name, customer_phone, status, created_at, updated_at, current_lat, current_lng, eta_minutes',
            b.worker_id, b.customer_name, b.customer_phone
        )
        return {'success': True, 'booking': dict(row)}

@app.get('/api/bookings/{booking_id}', response_model=BookingOut)
async def get_booking(booking_id: int):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow('SELECT id, worker_id, customer_name, customer_phone, status, created_at, updated_at, current_lat, current_lng, eta_minutes FROM bookings WHERE id = $1', booking_id)
        if not row:
            raise HTTPException(status_code=404, detail='Booking not found')
        return dict(row)

@app.post('/api/bookings/{booking_id}/update-location')
async def update_location(booking_id: int, loc: LocationUpdate):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute('UPDATE bookings SET current_lat = $1, current_lng = $2, updated_at = NOW(), status = COALESCE($3, status), eta_minutes = COALESCE($4, eta_minutes) WHERE id = $5', loc.lat, loc.lng, loc.status, loc.eta_minutes, booking_id)
        # insert history
        await conn.execute('INSERT INTO booking_location_history (booking_id, lat, lng) VALUES ($1,$2,$3)', booking_id, loc.lat, loc.lng)

    # broadcast to websocket subscribers
    msg = json.dumps({'type': 'location', 'booking_id': booking_id, 'lat': loc.lat, 'lng': loc.lng, 'status': loc.status, 'eta_minutes': loc.eta_minutes})
    subscribers = list(app.state.booking_subscribers.get(booking_id, []))
    for ws in subscribers:
        try:
            await ws.send_text(msg)
        except Exception:
            # ignore send errors (disconnected sockets will be removed in websocket loop)
            pass

    return {'success': True}

@app.websocket('/ws/bookings/{booking_id}')
async def websocket_booking(websocket: WebSocket, booking_id: int):
    await websocket.accept()
    subs = app.state.booking_subscribers
    subs[booking_id].add(websocket)
    try:
        while True:
            # keep connection open; optionally receive pings from client
            await websocket.receive_text()
    except WebSocketDisconnect:
        subs[booking_id].discard(websocket)
    finally:
        subs[booking_id].discard(websocket)