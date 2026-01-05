import Link from 'next/link'
export default function Booking(){
  return (
    <div className="wrap">
      <h1>Booking</h1>
      <p>Booking UI will call the Python backend (`PYTHON_BACKEND_URL`) for bookings and WebSocket updates.</p>
      <p><Link href="/"><a>Back</a></Link></p>
    </div>
  )
}