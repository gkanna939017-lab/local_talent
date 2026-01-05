const pool = require('./db');
(async () => {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='bookings'");
    console.log(res.rows);
  } catch (err) {
    console.error('Err', err.message);
  } finally {
    pool.end();
  }
})();