const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Test connessione
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Errore di connessione al database:', err.stack);
    console.log("DB_USER:", process.env.DB_USER);
    console.log("DB_PASSWORD:", typeof process.env.DB_PASSWORD);
  } else {
    console.log('Connessione al database avvenuta con successo:', res.rows[0].now);
  }
});

module.exports = pool;
