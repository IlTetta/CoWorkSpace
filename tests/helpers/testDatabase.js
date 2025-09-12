// tests/helpers/testDatabase.js
const { Pool } = require('pg');

// Configurazione database dedicata ai test
const testPoolConfig = {
    user: process.env.TEST_DB_USER || process.env.DB_USER,
    host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
    database: process.env.TEST_DB_NAME || process.env.DB_DATABASE + '_test',
    password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD,
    port: parseInt(process.env.TEST_DB_PORT) || parseInt(process.env.DB_PORT) || 5432,
    max: 10, // Pool più piccolo per i test
    min: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    ssl: false // Nessun SSL per i test locali
};

let testPool = null;

const createTestPool = () => {
    if (!testPool) {
        testPool = new Pool(testPoolConfig);
        
        testPool.on('error', (err) => {
            console.error('[TEST DB] Errore connessione pool:', err);
        });
    }
    return testPool;
};

const initializeTestDatabase = async () => {
    const pool = createTestPool();
    
    try {
        // Test connessione
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        
        console.log('[TEST DB] Connessione database test stabilita');
        return true;
    } catch (error) {
        console.error('[TEST DB] Errore connessione:', error.message);
        throw new Error(`Impossibile connettersi al database test: ${error.message}`);
    }
};

const queryTestDb = async (text, params) => {
    const pool = createTestPool();
    try {
        const result = await pool.query(text, params);
        return result;
    } catch (error) {
        console.error('[TEST DB] Errore query:', error.message);
        throw error;
    }
};

const closeTestDatabase = async () => {
    if (testPool) {
        try {
            await testPool.end();
            testPool = null;
            console.log('[TEST DB] Pool test chiuso');
        } catch (error) {
            console.error('[TEST DB] Errore chiusura pool:', error.message);
        }
    }
};

// Funzione per pulire le tabelle dopo i test
const cleanupTestData = async () => {
    const pool = createTestPool();
    
    try {
        await pool.query('BEGIN');
        
        // Disabilita i constraint di foreign key temporaneamente
        await pool.query('SET CONSTRAINTS ALL DEFERRED');
        
        // Pulisci le tabelle in ordine corretto (per evitare problemi di FK)
        const tablesToClean = [
            'notifications',
            'payments',
            'bookings',
            'availability',
            'spaces',
            'space_types',
            'locations',
            'users'
        ];
        
        for (const table of tablesToClean) {
            await pool.query(`DELETE FROM ${table} WHERE created_at > NOW() - INTERVAL '1 hour'`);
        }
        
        await pool.query('COMMIT');
        console.log('[TEST DB] Cleanup dati test completato');
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('[TEST DB] Errore durante cleanup:', error.message);
        throw error;
    }
};

module.exports = {
    initializeTestDatabase,
    queryTestDb,
    closeTestDatabase,
    cleanupTestData,
    testPoolConfig
};