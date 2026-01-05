-- Migration: create bookings table

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  worker_id INT REFERENCES workers(id) ON DELETE SET NULL,
  customer_name VARCHAR(100),
  customer_phone VARCHAR(20),
  status VARCHAR(32) DEFAULT 'pending', -- pending, accepted, enroute, complete, cancelled
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  eta_minutes INT
);

CREATE INDEX IF NOT EXISTS idx_bookings_worker_id ON bookings(worker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Optionally: keep brief history table for tracking events (not required now)
CREATE TABLE IF NOT EXISTS booking_location_history (
  id SERIAL PRIMARY KEY,
  booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  recorded_at TIMESTAMP DEFAULT NOW()
);