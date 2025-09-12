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

// IMPORTANTE: Mockiamo anche i servizi esterni come nel register test
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

describe('POST /api/users/login - Integration Tests', () => {
    let createdUserIds = [];
    let testUser = null;

    // Setup: inizializza database e crea utente di test
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
                // Usa user_id per la query ma gli ID vengono da response.body.data.user.id
                await testDb.query(
                    'DELETE FROM users WHERE user_id = ANY($1)',
                    [createdUserIds]
                );
                console.log(`🧹 Cleanup: rimossi ${createdUserIds.length} utenti di test`);
                createdUserIds = [];
                testUser = null;
            } catch (error) {
                console.error('❌ Errore durante cleanup:', error.message);
            }
        }
        
        // Aggiungi un piccolo delay per evitare rate limiting tra i test
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

    // Helper function per creare un utente di test
    const createTestUser = async (userData = {}) => {
        const timestamp = Date.now();
        const defaultUserData = {
            name: 'Test',
            surname: 'User',
            email: `test.user.${timestamp}@example.com`,
            password: 'TestPassword123!',
            requestManagerRole: false,
            ...userData
        };

        const response = await request(app)
            .post('/api/users/register')
            .send(defaultUserData)
            .expect(201);

        const user = response.body.data.user;
        createdUserIds.push(user.id);
        
        return {
            userData: defaultUserData,
            user: user,
            token: response.body.data.token
        };
    };

    describe('Login con credenziali valide', () => {
        test('Dovrebbe permettere login con credenziali corrette', async () => {
            // Crea un utente di test
            const { userData } = await createTestUser();

            // Prova a fare login
            const loginData = {
                email: userData.email,
                password: userData.password
            };

            const response = await request(app)
                .post('/api/users/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(200);

            // Verifica struttura della risposta
            expect(response.body).toHaveProperty('status', 'success');
            expect(response.body).toHaveProperty('message', 'Login avvenuto con successo');
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('token');
            expect(response.body.data).toHaveProperty('user');

            // Verifica dati utente restituiti
            const user = response.body.data.user;
            expect(user).toHaveProperty('id');
            expect(user).toHaveProperty('email', userData.email);
            expect(user).toHaveProperty('name', userData.name);
            expect(user).toHaveProperty('surname', userData.surname);
            expect(user).toHaveProperty('role', 'user');
            expect(user).not.toHaveProperty('password'); // Password non deve essere restituita
            expect(user).not.toHaveProperty('password_hash'); // Hash password non deve essere restituito

            // Verifica token JWT
            expect(response.body.data.token).toBeTruthy();
            expect(typeof response.body.data.token).toBe('string');

            // Verifica che il token sia valido
            const decoded = jwt.verify(response.body.data.token, process.env.JWT_SECRET);
            expect(decoded).toHaveProperty('id', user.id); // Il token usa 'id' non 'userId'
            expect(decoded).toHaveProperty('email', user.email);
            expect(decoded).toHaveProperty('role', user.role);
        });

        test('Dovrebbe gestire login per utente manager approvato', async () => {
            // Crea un utente manager (simuliamo approvazione settando direttamente nel DB)
            const { userData, user } = await createTestUser({ 
                name: 'Manager',
                surname: 'User',
                requestManagerRole: false  // Lo creiamo normale e poi lo promuoviamo
            });

            // Promuovi utente a manager nel database
            await testDb.query(
                'UPDATE users SET role = $1 WHERE user_id = $2',
                ['manager', user.id]
            );

            // Prova a fare login
            const loginData = {
                email: userData.email,
                password: userData.password
            };

            const response = await request(app)
                .post('/api/users/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(200);

            // Verifica che il ruolo sia manager
            expect(response.body.data.user.role).toBe('manager');

            // Verifica token JWT con ruolo manager
            const decoded = jwt.verify(response.body.data.token, process.env.JWT_SECRET);
            expect(decoded.role).toBe('manager');
        });
    });

    describe('Login con credenziali non valide', () => {
        test('Dovrebbe rifiutare login con email non esistente', async () => {
            const loginData = {
                email: 'nonexistent@example.com',
                password: 'SomePassword123!'
            };

            const response = await request(app)
                .post('/api/users/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('status', 'error');
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toMatch(/email|password|corretti/i); // Aggiorniamo il pattern
        });

        test('Dovrebbe rifiutare login con password errata', async () => {
            // Crea un utente di test
            const { userData } = await createTestUser();

            // Prova a fare login con password sbagliata
            const loginData = {
                email: userData.email,
                password: 'WrongPassword123!'
            };

            const response = await request(app)
                .post('/api/users/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('status', 'error');
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toMatch(/email|password|corretti/i); // Aggiorniamo il pattern
        });

        test('Dovrebbe rifiutare login per utente con richiesta manager pending', async () => {
            // Crea un utente con richiesta manager (che non può fare login)
            const timestamp = Date.now();
            const userData = {
                name: 'Pending',
                surname: 'Manager',
                email: `pending.manager.${timestamp}@example.com`,
                password: 'TestPassword123!',
                requestManagerRole: true
            };

            const registerResponse = await request(app)
                .post('/api/users/register')
                .send(userData)
                .expect(202); // 202 = Accepted (pending approval)

            createdUserIds.push(registerResponse.body.data.user.id);

            // Prova a fare login (dovrebbe essere negato)
            const loginData = {
                email: userData.email,
                password: userData.password
            };

            const response = await request(app)
                .post('/api/users/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(403); // 403 = Forbidden

            expect(response.body).toHaveProperty('status', 'error');
            expect(response.body.message).toMatch(/manager|approvazione|pending/i);
        });
    });

    describe('Validazione dati di input', () => {
        test('Dovrebbe rifiutare login con email mancante', async () => {
            const loginData = {
                password: 'SomePassword123!'
                // email mancante
            };

            const response = await request(app)
                .post('/api/users/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('status', 'fail');
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors).toBeInstanceOf(Array);
            
            // Verifica che l'errore riguardi l'email
            const emailError = response.body.errors.find(error => error.path === 'email');
            expect(emailError).toBeTruthy();
        });

        test('Dovrebbe rifiutare login con password mancante', async () => {
            const loginData = {
                email: 'test@example.com'
                // password mancante
            };

            const response = await request(app)
                .post('/api/users/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('status', 'fail');
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors).toBeInstanceOf(Array);
            
            // Verifica che l'errore riguardi la password
            const passwordError = response.body.errors.find(error => error.path === 'password');
            expect(passwordError).toBeTruthy();
        });

        test('Dovrebbe rifiutare login con email formato non valido', async () => {
            const loginData = {
                email: 'invalid-email-format',
                password: 'SomePassword123!'
            };

            const response = await request(app)
                .post('/api/users/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('status', 'fail');
            expect(response.body.errors.some(error => 
                error.path === 'email' && (error.msg.includes('email') || error.msg.includes('valid'))
            )).toBe(true);
        });

        test('Dovrebbe rifiutare login con campi vuoti', async () => {
            const loginData = {
                email: '',
                password: ''
            };

            const response = await request(app)
                .post('/api/users/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('status', 'fail');
            expect(response.body.errors.length).toBeGreaterThan(0);
        });
    });

    describe('Flusso completo registrazione → login', () => {
        test('Dovrebbe permettere login immediatamente dopo registrazione', async () => {
            // Registra un nuovo utente
            const timestamp = Date.now();
            const userData = {
                name: 'Flow',
                surname: 'Test',
                email: `flow.test.${timestamp}@example.com`,
                password: 'FlowTest123!',
                requestManagerRole: false
            };

            const registerResponse = await request(app)
                .post('/api/users/register')
                .send(userData)
                .expect(201);

            createdUserIds.push(registerResponse.body.data.user.id);

            // Subito dopo, prova a fare login con le stesse credenziali
            const loginData = {
                email: userData.email,
                password: userData.password
            };

            const loginResponse = await request(app)
                .post('/api/users/login')
                .send(loginData)
                .expect(200);

            // Verifica che i dati utente siano coerenti
            expect(loginResponse.body.data.user.email).toBe(registerResponse.body.data.user.email);
            expect(loginResponse.body.data.user.name).toBe(registerResponse.body.data.user.name);
            expect(loginResponse.body.data.user.id).toBe(registerResponse.body.data.user.id);

            // Verifica che entrambi i token siano validi
            const registerToken = jwt.verify(registerResponse.body.data.token, process.env.JWT_SECRET);
            const loginToken = jwt.verify(loginResponse.body.data.token, process.env.JWT_SECRET);
            
            expect(registerToken.id).toBe(loginToken.id); // I token usano 'id' non 'userId'
            expect(registerToken.email).toBe(loginToken.email);
        });
    });
});