// src/backend/config/db.js

const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

// Configurazione pool con parametri ottimizzati
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  
  // Configurazione pool avanzata
  max: parseInt(process.env.DB_POOL_MAX) || 20, // max connessioni
  min: parseInt(process.env.DB_POOL_MIN) || 2,  // min connessioni
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000,
  
  // SSL per produzione
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Event listeners per monitoring
pool.on('connect', (client) => {
  console.log(`[DB] Nuova connessione stabilita: ${client.processID}`);
});

pool.on('error', (err, client) => {
  console.error('[DB] Errore connessione inattesa:', err);
  process.exit(-1);
});

pool.on('acquire', (client) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DB] Client acquisito: ${client.processID}`);
  }
});

pool.on('remove', (client) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DB] Client rimosso: ${client.processID}`);
  }
});

// Funzione per testare la connessione
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('[DB] Connessione al database stabilita con successo');
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log(`[DB] Server time: ${result.rows[0].current_time}`);
    console.log(`[DB] PostgreSQL version: ${result.rows[0].db_version.split(' ')[0]} ${result.rows[0].db_version.split(' ')[1]}`);
    client.release();
    return true;
  } catch (error) {
    console.error('[DB] Errore nella connessione al database:', error.message);
    return false;
  }
};

// Wrapper per query con retry logic e performance monitoring
const queryWithRetry = async (text, params, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const start = Date.now();
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      // Log query lente
      if (duration > 1000) {
        console.warn(`[DB] Query lenta (${duration}ms): ${text.substring(0, 100)}...`);
      }
      
      // Log query in development
      if (process.env.NODE_ENV === 'development' && duration > 100) {
        console.log(`[DB] Query executed in ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      console.error(`[DB] Tentativo ${attempt}/${retries} fallito:`, error.message);
      
      if (attempt === retries) {
        // Log dettagli errore per debugging
        console.error('[DB] Query fallita definitivamente:', {
          query: text.substring(0, 200),
          params: params ? JSON.stringify(params) : 'none',
          error: error.message
        });
        throw error;
      }
      
      // Aspetta prima del retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};

// Funzione per eseguire transazioni con retry automatico
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Funzione per graceful shutdown
const closePool = async () => {
  try {
    await pool.end();
    console.log('[DB] Pool connessioni chiuso');
  } catch (error) {
    console.error('[DB] Errore nella chiusura del pool:', error);
  }
};

// Health check del database
const healthCheck = async () => {
  try {
    const start = Date.now();
    const result = await pool.query('SELECT 1 as health');
    const responseTime = Date.now() - start;
    
    return { 
      status: 'healthy', 
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount
    };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error.message,
      timestamp: new Date().toISOString() 
    };
  }
};

// Funzione per ottenere statistiche del pool
const getPoolStats = () => {
  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingClients: pool.waitingCount,
    config: {
      max: pool.options.max,
      min: pool.options.min,
      idleTimeoutMillis: pool.options.idleTimeoutMillis,
      connectionTimeoutMillis: pool.options.connectionTimeoutMillis
    }
  };
};

// Inizializzazione e test connessione all'avvio
const initialize = async () => {
  console.log('[DB] Inizializzazione database...');
  const connected = await testConnection();
  
  if (!connected) {
    console.error('[DB] ERRORE: Impossibile connettersi al database');
    process.exit(1);
  }
  
  console.log('[DB] Database inizializzato correttamente');
  console.log('[DB] Pool stats:', getPoolStats());
  
  return true;
};

module.exports = {
  query: queryWithRetry,
  transaction,
  pool,
  testConnection,
  closePool,
  healthCheck,
  getPoolStats,
  initialize
};