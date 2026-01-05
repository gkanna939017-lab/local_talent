// Load environment variables for local development
require('dotenv').config();
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.PGUSER || "postgres",
  host: process.env.PGHOST || "localhost",
  database: process.env.PGDATABASE || "local_talent",
  password: process.env.PGPASSWORD || "postgres",   // 🔴 change if needed
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432
});

module.exports = pool;
