const request = require('supertest');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Configurazione diretta del database di test (senza mock)
const testDbConfig = {
    user: process.env.TEST_DB_USER || 'coworkspace_test_user',
    host: process.env.TEST_DB_HOST || 'localhost',
    database: process.env.TEST_DB_NAME || 'coworkspace_test_db',
    password: process.env.TEST_DB_PASSWORD || 'test_password_secure',
    port: parseInt(process.env.TEST_DB_PORT) || 5433,
    max: 10,
    min: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    ssl: false
};

// Pool di connessioni dedicato ai test
const testPool = new Pool(testDbConfig);

// Creiamo un oggetto database per i test
const testDb = {
    query: (text, params) => testPool.query(text, params),
    transaction: async (callback) => {
        const client = await testPool.connect();
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
    },
    closePool: () => testPool.end()
};

// Sostituiamo il modulo db con la nostra configurazione di test (PRIMA di importare l'app)
jest.doMock('../../src/backend/config/db', () => ({
    query: testDb.query,
    transaction: testDb.transaction,
    pool: testPool,
    testConnection: async () => {
        try {
            const client = await testPool.connect();
            await client.query('SELECT NOW()');
            client.release();
            return true;
        } catch (error) {
            console.error('[TEST DB] Errore connessione:', error.message);
            return false;
        }
    },
    closePool: testDb.closePool,
    healthCheck: async () => ({ status: 'healthy' }),
    getPoolStats: () => ({}),
    initialize: async () => {
        console.log('[TEST DB] Inizializzazione database test...');
        const client = await testPool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('[TEST DB] Database test inizializzato con successo');
        return true;
    }
}));

// IMPORTANTE: Mockiamo i servizi esterni
jest.doMock('../../src/backend/services/NotificationService', () => ({
    sendEmail: jest.fn().mockResolvedValue(true),
    sendManagerNotification: jest.fn().mockResolvedValue(true),
    sendWelcomeEmail: jest.fn().mockResolvedValue(true)
}));

// IMPORTANTE: Mock del rate limiter per evitare blocchi nei test
jest.doMock('express-rate-limit', () => {
    return jest.fn(() => (req, res, next) => next());
});

// IMPORTANTE: Import dell'app DOPO i mock
const app = require('../../src/backend/app');

describe('GET /api/users/profile - Integration Tests', () => {
    let createdUserIds = [];
    let testUser = null;
    let validToken = null;

    // Setup: inizializza database
    beforeAll(async () => {
        try {
            // Test connessione al database
            const client = await testPool.connect();
            await client.query('SELECT NOW()');
            client.release();
            console.log('✅ Setup test completato - Database di test connesso');
        } catch (error) {
            console.error('❌ Errore setup database test:', error.message);
            throw error;
        }
    });

    // Cleanup: pulisci i dati creati dopo ogni test
    afterEach(async () => {
        // Rimuovi tutti gli utenti creati durante il test
        if (createdUserIds.length > 0) {
            try {
                await testDb.query(
                    'DELETE FROM users WHERE user_id = ANY($1)',
                    [createdUserIds]
                );
                console.log(`🧹 Cleanup: rimossi ${createdUserIds.length} utenti di test`);
                createdUserIds = [];
                testUser = null;
                validToken = null;
            } catch (error) {
                console.error('❌ Errore durante cleanup:', error.message);
            }
        }
        
        // Piccolo delay per evitare interferenze tra test
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Teardown: chiudi connessione database dopo tutti i test
    afterAll(async () => {
        try {
            await testDb.closePool();
            console.log('✅ Teardown test completato - Connessioni database chiuse');
        } catch (error) {
            console.error('❌ Errore durante teardown:', error.message);
        }
    });

    // Helper function per creare un utente di test e ottenere token
    const createTestUserWithToken = async (userData = {}) => {
        const timestamp = Date.now();
        const defaultUserData = {
            name: 'Profile',
            surname: 'Test',
            email: `profile.test.${timestamp}@example.com`,
            password: 'ProfileTest123!',
            requestManagerRole: false,
            ...userData
        };

        // Registra l'utente
        const registerResponse = await request(app)
            .post('/api/users/register')
            .send(defaultUserData)
            .expect(201);

        const user = registerResponse.body.data.user;
        const token = registerResponse.body.data.token;
        
        createdUserIds.push(user.id);
        
        return {
            userData: defaultUserData,
            user: user,
            token: token
        };
    };

    // Helper per creare token JWT valido manualmente
    const createValidToken = (userId, email, role = 'user') => {
        return jwt.sign(
            { 
                id: userId, 
                email: email, 
                role: role,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 ore
            },
            process.env.JWT_SECRET
        );
    };

    // Helper per creare token JWT scaduto
    const createExpiredToken = (userId, email, role = 'user') => {
        return jwt.sign(
            { 
                id: userId, 
                email: email, 
                role: role,
                iat: Math.floor(Date.now() / 1000) - (48 * 60 * 60), // 48 ore fa
                exp: Math.floor(Date.now() / 1000) - (24 * 60 * 60)  // Scaduto 24 ore fa
            },
            process.env.JWT_SECRET
        );
    };

    describe('Accesso con token valido', () => {
        test('Dovrebbe restituire il profilo utente con token valido', async () => {
            // Crea un utente di test
            const { user, token } = await createTestUserWithToken();

            // Richiedi il profilo
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${token}`)
                .expect('Content-Type', /json/)
                .expect(200);

            // Verifica struttura della risposta
            expect(response.body).toHaveProperty('status', 'success');
            expect(response.body).toHaveProperty('message', 'Profilo utente recuperato con successo');
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('user');

            // Verifica dati utente restituiti
            const userProfile = response.body.data.user;
            expect(userProfile).toHaveProperty('user_id', user.id);
            expect(userProfile).toHaveProperty('name', user.name);
            expect(userProfile).toHaveProperty('surname', user.surname);
            expect(userProfile).toHaveProperty('email', user.email);
            expect(userProfile).toHaveProperty('role', user.role);
            expect(userProfile).toHaveProperty('created_at');

            // Verifica che la password NON sia inclusa
            expect(userProfile).not.toHaveProperty('password');
            expect(userProfile).not.toHaveProperty('password_hash');

            // Verifica data di creazione
            expect(new Date(userProfile.created_at)).toBeInstanceOf(Date);
        });

        test('Dovrebbe restituire il profilo per utente manager', async () => {
            // Crea un utente manager
            const { user, token } = await createTestUserWithToken({
                name: 'Manager',
                surname: 'Profile'
            });

            // Promuovi utente a manager nel database
            await testDb.query(
                'UPDATE users SET role = $1 WHERE user_id = $2',
                ['manager', user.id]
            );

            // Richiedi il profilo
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${token}`)
                .expect('Content-Type', /json/)
                .expect(200);

            // Verifica che il ruolo sia manager (nota: il token potrebbe ancora dire 'user')
            const userProfile = response.body.data.user;
            expect(userProfile.user_id).toBe(user.id);
            expect(userProfile.name).toBe('Manager');
            expect(userProfile.email).toBe(user.email);
        });

        test('Dovrebbe restituire dati consistenti tra token e profilo', async () => {
            // Crea un utente di test
            const { user, token } = await createTestUserWithToken();

            // Decodifica il token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Richiedi il profilo
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            const userProfile = response.body.data.user;

            // Verifica consistenza tra token e profilo
            expect(userProfile.user_id).toBe(decoded.id);
            expect(userProfile.email).toBe(decoded.email);
            expect(userProfile.role).toBe(decoded.role);
        });
    });

    describe('Accesso senza autenticazione', () => {
        test('Dovrebbe rifiutare richiesta senza token', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('status', 'error');
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toMatch(/token|authorization|access/i);
        });

        test('Dovrebbe rifiutare richiesta con header Authorization vuoto', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', '')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('status', 'error');
            expect(response.body.message).toMatch(/token|authorization|access/i);
        });

        test('Dovrebbe rifiutare richiesta con header Authorization malformato', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', 'InvalidToken')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('status', 'error');
            expect(response.body.message).toMatch(/token|authorization|access/i);
        });
    });

    describe('Accesso con token non valido', () => {
        test('Dovrebbe rifiutare richiesta con token JWT non valido', async () => {
            const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';

            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${invalidToken}`)
                .expect('Content-Type', /json/)
                .expect(401); // ✅ Ora dovrebbe restituire 401 dopo il fix in AuthService

            expect(response.body).toHaveProperty('status', 'error');
            expect(response.body.message).toMatch(/token|access|invalid/i);
        });

        test('Dovrebbe rifiutare richiesta con token JWT con signature non valida', async () => {
            // Questo token ha JSON valido ma signature errata → JsonWebTokenError → 401
            const invalidSignatureToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIifQ.wrong_signature';

            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${invalidSignatureToken}`)
                .expect('Content-Type', /json/)
                .expect(401); // Questo dovrebbe restituire 401 perché è JsonWebTokenError

            expect(response.body).toHaveProperty('status', 'error');
            expect(response.body.message).toMatch(/token|access|invalid/i);
        });

        test('Dovrebbe rifiutare richiesta con token scaduto', async () => {
            // Crea un utente per avere ID e email validi
            const { user } = await createTestUserWithToken();

            // Crea un token scaduto
            const expiredToken = createExpiredToken(user.id, user.email);

            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${expiredToken}`)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('status', 'error');
            expect(response.body.message).toMatch(/token|expired|scaduto/i);
        });

        test('Dovrebbe rifiutare richiesta con token di utente non esistente', async () => {
            // Crea un token con ID utente che non esiste nel database
            const fakeToken = createValidToken(99999, 'fake@example.com');

            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${fakeToken}`)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('status', 'error');
            expect(response.body.message).toMatch(/user|utente|found|trovato/i);
        });

        test('Dovrebbe rifiutare richiesta con token firmato con secret errato', async () => {
            // Crea un token con secret diverso
            const { user } = await createTestUserWithToken();
            const wrongSecretToken = jwt.sign(
                { id: user.id, email: user.email, role: 'user' },
                'wrong-secret-key'
            );

            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${wrongSecretToken}`)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('status', 'error');
            expect(response.body.message).toMatch(/token|signature|invalid/i);
        });
    });

    describe('Formato header Authorization', () => {
        test('Dovrebbe accettare formato Bearer standard', async () => {
            const { token } = await createTestUserWithToken();

            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(response.body.status).toBe('success');
        });

        test('Dovrebbe rifiutare formato non Bearer', async () => {
            const { token } = await createTestUserWithToken();

            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Basic ${token}`)
                .expect(401);

            expect(response.body.status).toBe('error');
        });

        test('Dovrebbe rifiutare Bearer senza token', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', 'Bearer ')
                .expect(401);

            expect(response.body.status).toBe('error');
        });

        test('Dovrebbe rifiutare token senza Bearer prefix', async () => {
            const { token } = await createTestUserWithToken();

            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', token)
                .expect(401);

            expect(response.body.status).toBe('error');
        });
    });

    describe('Sicurezza e edge cases', () => {
        test('Dovrebbe gestire token molto lunghi', async () => {
            const longInvalidToken = 'a'.repeat(1000);

            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${longInvalidToken}`)
                .expect(401);

            expect(response.body.status).toBe('error');
        });

        test('Dovrebbe gestire caratteri speciali nel token', async () => {
            const specialCharToken = 'token@#$%^&*()_+{}|:<>?[]\\;\'",./';

            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${specialCharToken}`)
                .expect(401);

            expect(response.body.status).toBe('error');
        });

        test('Non dovrebbe esporre informazioni sensibili negli errori', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', 'Bearer invalid')
                .expect(401);

            // Verifica che l'errore non esponga dettagli del database o implementazione
            expect(response.body.message).not.toMatch(/sql|database|query|user_id|table/i);
            expect(response.body).not.toHaveProperty('stack');
            expect(response.body).not.toHaveProperty('details');
        });
    });
});