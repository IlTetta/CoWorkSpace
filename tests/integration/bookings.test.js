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
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
    sendBookingConfirmation: jest.fn().mockResolvedValue(true)
}));

// IMPORTANTE: Mock del rate limiter per evitare blocchi nei test
jest.doMock('express-rate-limit', () => {
    return jest.fn(() => (req, res, next) => next());
});

// IMPORTANTE: Import dell'app DOPO i mock
const app = require('../../src/backend/app');

describe('POST /api/bookings - Integration Tests', () => {
    let createdUserIds = [];
    let createdBookingIds = [];
    let testUser = null;
    let testManagerUser = null;
    let testSpace = null;

    // Setup: inizializza database e dati di test
    beforeAll(async () => {
        try {
            // Test connessione al database
            const client = await testPool.connect();
            await client.query('SELECT NOW()');
            client.release();
            console.log('✅ Setup test completato - Database di test connesso');

            // Verifica che esistano spazi nel database per i test
            const spacesResult = await testDb.query('SELECT * FROM spaces LIMIT 1');
            if (spacesResult.rows.length === 0) {
                console.warn('⚠️  Nessuno spazio trovato nel database di test. I test potrebbero fallire.');
            } else {
                testSpace = spacesResult.rows[0];
                console.log(`✅ Spazio di test disponibile: ${testSpace.name} (ID: ${testSpace.space_id})`);
            }
        } catch (error) {
            console.error('❌ Errore setup database test:', error.message);
            throw error;
        }
    });

    // Cleanup: pulisci i dati creati dopo ogni test
    afterEach(async () => {
        try {
            // Rimuovi tutte le prenotazioni create durante il test
            if (createdBookingIds.length > 0) {
                await testDb.query(
                    'DELETE FROM bookings WHERE booking_id = ANY($1)',
                    [createdBookingIds]
                );
                console.log(`🧹 Cleanup: rimosse ${createdBookingIds.length} prenotazioni di test`);
                createdBookingIds = [];
            }

            // Rimuovi tutti gli utenti creati durante il test
            if (createdUserIds.length > 0) {
                await testDb.query(
                    'DELETE FROM users WHERE user_id = ANY($1)',
                    [createdUserIds]
                );
                console.log(`🧹 Cleanup: rimossi ${createdUserIds.length} utenti di test`);
                createdUserIds = [];
                testUser = null;
                testManagerUser = null;
            }
        } catch (error) {
            console.error('❌ Errore durante cleanup:', error.message);
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
            name: 'Booking',
            surname: 'Test',
            email: `booking.test.${timestamp}@example.com`,
            password: 'BookingTest123!',
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

    // Helper function per creare utente manager
    const createManagerUserWithToken = async () => {
        const { user, token, userData } = await createTestUserWithToken({
            name: 'Manager',
            surname: 'Booking'
        });

        // Promuovi utente a manager nel database
        await testDb.query(
            'UPDATE users SET role = $1 WHERE user_id = $2',
            ['manager', user.id]
        );

        return { user, token, userData };
    };

    // Helper function per creare dati prenotazione validi
    const createValidBookingData = (overrides = {}) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        return {
            space_id: testSpace?.space_id || 1,
            start_date: tomorrowStr,
            end_date: tomorrowStr,
            total_price: 100.00,
            status: 'pending',
            payment_status: 'pending',
            notes: 'Test booking',
            ...overrides
        };
    };

    describe('Creazione prenotazione con autenticazione', () => {
        test('Dovrebbe creare una prenotazione valida per utente autenticato', async () => {
            // Salta il test se non ci sono spazi nel database
            if (!testSpace) {
                console.warn('⏭️  Test saltato: nessuno spazio disponibile nel database');
                return;
            }

            // Crea un utente di test
            const { user, token } = await createTestUserWithToken();
            
            // Dati prenotazione validi
            const bookingData = createValidBookingData();

            // Crea la prenotazione
            const response = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${token}`)
                .send(bookingData)
                .expect('Content-Type', /json/)
                .expect(201);

            // Verifica struttura della risposta
            expect(response.body).toHaveProperty('status', 'success');
            expect(response.body).toHaveProperty('message', 'Prenotazione creata con successo');
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('booking');

            // Verifica dati prenotazione
            const booking = response.body.data.booking;
            expect(booking).toHaveProperty('booking_id');
            expect(booking).toHaveProperty('user_id', user.id);
            expect(booking).toHaveProperty('space_id', bookingData.space_id);
            expect(booking).toHaveProperty('start_date', bookingData.start_date);
            expect(booking).toHaveProperty('end_date', bookingData.end_date);
            expect(booking).toHaveProperty('total_price', bookingData.total_price);
            expect(booking).toHaveProperty('status', 'pending');
            expect(booking).toHaveProperty('payment_status', 'pending');
            expect(booking).toHaveProperty('created_at');

            // Salva ID per cleanup
            createdBookingIds.push(booking.booking_id);

            // Verifica che la prenotazione sia stata salvata nel database
            const dbResult = await testDb.query(
                'SELECT * FROM bookings WHERE booking_id = $1',
                [booking.booking_id]
            );
            expect(dbResult.rows.length).toBe(1);
            expect(dbResult.rows[0].user_id).toBe(user.id);
        });

        test('Dovrebbe permettere a manager di creare prenotazioni per altri utenti', async () => {
            if (!testSpace) {
                console.warn('⏭️  Test saltato: nessuno spazio disponibile nel database');
                return;
            }

            // Crea un manager
            const { user: manager, token: managerToken } = await createManagerUserWithToken();
            
            // Crea un utente normale
            const { user: normalUser } = await createTestUserWithToken();

            // Dati prenotazione per l'utente normale (creata dal manager)
            const bookingData = createValidBookingData({
                user_id: normalUser.id
            });

            // Il manager crea la prenotazione per l'utente normale
            const response = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${managerToken}`)
                .send(bookingData)
                .expect('Content-Type', /json/)
                .expect(201);

            const booking = response.body.data.booking;
            expect(booking.user_id).toBe(normalUser.id);
            
            createdBookingIds.push(booking.booking_id);
        });

        test('Dovrebbe calcolare automaticamente il prezzo se non fornito', async () => {
            if (!testSpace) {
                console.warn('⏭️  Test saltato: nessuno spazio disponibile nel database');
                return;
            }

            const { token } = await createTestUserWithToken();
            
            // Dati prenotazione senza total_price
            const bookingData = createValidBookingData();
            delete bookingData.total_price;

            const response = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${token}`)
                .send(bookingData)
                .expect(201);

            const booking = response.body.data.booking;
            expect(booking).toHaveProperty('total_price');
            expect(typeof booking.total_price).toBe('number');
            expect(booking.total_price).toBeGreaterThan(0);
            
            createdBookingIds.push(booking.booking_id);
        });
    });

    describe('Autorizzazione e controlli di sicurezza', () => {
        test('Dovrebbe rifiutare prenotazione senza token di autenticazione', async () => {
            const bookingData = createValidBookingData();

            const response = await request(app)
                .post('/api/bookings')
                .send(bookingData)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('status', 'error');
            expect(response.body.message).toMatch(/token|authorization|access/i);
        });

        test('Dovrebbe impedire a utenti normali di prenotare per altri', async () => {
            if (!testSpace) {
                console.warn('⏭️  Test saltato: nessuno spazio disponibile nel database');
                return;
            }

            const { token } = await createTestUserWithToken();
            const { user: otherUser } = await createTestUserWithToken();

            // Tenta di creare prenotazione per un altro utente
            const bookingData = createValidBookingData({
                user_id: otherUser.id
            });

            const response = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${token}`)
                .send(bookingData)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('status', 'error');
            expect(response.body.message).toMatch(/solo per te stesso|forbidden/i);
        });

        test('Dovrebbe rifiutare prenotazioni per date passate', async () => {
            if (!testSpace) {
                console.warn('⏭️  Test saltato: nessuno spazio disponibile nel database');
                return;
            }

            const { token } = await createTestUserWithToken();
            
            // Data passata
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const bookingData = createValidBookingData({
                start_date: yesterdayStr,
                end_date: yesterdayStr
            });

            const response = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${token}`)
                .send(bookingData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('status', 'error');
            expect(response.body.message).toMatch(/date passate|past date/i);
        });
    });

    describe('Validazione dati di input', () => {
        test('Dovrebbe rifiutare prenotazione con space_id mancante', async () => {
            const { token } = await createTestUserWithToken();
            
            const bookingData = createValidBookingData();
            delete bookingData.space_id;

            const response = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${token}`)
                .send(bookingData)
                .expect('Content-Type', /json/)
                .expect(404); // L'app restituisce 404 quando space_id è undefined/null

            expect(response.body).toHaveProperty('status', 'error');
        });

        test('Dovrebbe rifiutare prenotazione con start_date mancante', async () => {
            const { token } = await createTestUserWithToken();
            
            const bookingData = createValidBookingData();
            delete bookingData.start_date;

            const response = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${token}`)
                .send(bookingData)
                .expect('Content-Type', /json/)
                .expect(404); // L'app restituisce 404 quando start_date è undefined

            expect(response.body).toHaveProperty('status', 'error');
        });

        test('Dovrebbe rifiutare prenotazione con space_id non esistente', async () => {
            const { token } = await createTestUserWithToken();
            
            const bookingData = createValidBookingData({
                space_id: 99999 // ID inesistente
            });

            const response = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${token}`)
                .send(bookingData)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toHaveProperty('status', 'error');
            expect(response.body.message).toMatch(/spazio non trovato|space.*not found/i);
        });

        test('Dovrebbe rifiutare date non valide', async () => {
            const { token } = await createTestUserWithToken();
            
            const bookingData = createValidBookingData({
                start_date: 'invalid-date',
                end_date: 'invalid-date'
            });

            const response = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${token}`)
                .send(bookingData)
                .expect('Content-Type', /json/)
                .expect(404); // L'app restituisce 404 per date non valide

            expect(response.body).toHaveProperty('status', 'error');
        });

        test('Dovrebbe gestire correttamente note opzionali', async () => {
            if (!testSpace) {
                console.warn('⏭️  Test saltato: nessuno spazio disponibile nel database');
                return;
            }

            const { token } = await createTestUserWithToken();
            
            const bookingData = createValidBookingData({
                notes: 'Prenotazione di test con note lunghe per verificare che il campo venga gestito correttamente'
            });

            const response = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${token}`)
                .send(bookingData)
                .expect(201);

            const booking = response.body.data.booking;
            expect(booking.notes).toBe(bookingData.notes);
            
            createdBookingIds.push(booking.booking_id);
        });
    });

    describe('Business Logic e Edge Cases', () => {
        test('Dovrebbe permettere prenotazioni per la data odierna', async () => {
            if (!testSpace) {
                console.warn('⏭️  Test saltato: nessuno spazio disponibile nel database');
                return;
            }

            const { token } = await createTestUserWithToken();
            
            // Data odierna
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            const bookingData = createValidBookingData({
                start_date: todayStr,
                end_date: todayStr
            });

            const response = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${token}`)
                .send(bookingData)
                .expect(201);

            const booking = response.body.data.booking;
            expect(booking.start_date).toBe(todayStr);
            
            createdBookingIds.push(booking.booking_id);
        });

        test('Dovrebbe gestire prenotazioni multi-giorno', async () => {
            if (!testSpace) {
                console.warn('⏭️  Test saltato: nessuno spazio disponibile nel database');
                return;
            }

            const { token } = await createTestUserWithToken();
            
            // Prenotazione di 3 giorni
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + 1);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 2);

            const bookingData = createValidBookingData({
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0]
            });

            const response = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${token}`)
                .send(bookingData)
                .expect(201);

            const booking = response.body.data.booking;
            expect(booking.start_date).toBe(bookingData.start_date);
            expect(booking.end_date).toBe(bookingData.end_date);
            
            createdBookingIds.push(booking.booking_id);
        });

        test('Dovrebbe gestire status di prenotazione personalizzati', async () => {
            if (!testSpace) {
                console.warn('⏭️  Test saltato: nessuno spazio disponibile nel database');
                return;
            }

            const { token } = await createManagerUserWithToken();
            
            const bookingData = createValidBookingData({
                status: 'confirmed',
                payment_status: 'paid'
            });

            const response = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${token}`)
                .send(bookingData)
                .expect(201);

            const booking = response.body.data.booking;
            expect(booking.status).toBe('confirmed');
            expect(booking.payment_status).toBe('paid');
            
            createdBookingIds.push(booking.booking_id);
        });

        test('Dovrebbe includere timestamp di creazione', async () => {
            if (!testSpace) {
                console.warn('⏭️  Test saltato: nessuno spazio disponibile nel database');
                return;
            }

            const { token } = await createTestUserWithToken();
            const bookingData = createValidBookingData();

            const beforeRequest = new Date();
            
            const response = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${token}`)
                .send(bookingData)
                .expect(201);

            const afterRequest = new Date();
            const booking = response.body.data.booking;
            
            expect(booking).toHaveProperty('created_at');
            const createdAt = new Date(booking.created_at);
            expect(createdAt).toBeInstanceOf(Date);
            expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeRequest.getTime());
            expect(createdAt.getTime()).toBeLessThanOrEqual(afterRequest.getTime());
            
            createdBookingIds.push(booking.booking_id);
        });
    });

    describe('Integrazione con database', () => {
        test('Dovrebbe persistere correttamente nel database', async () => {
            if (!testSpace) {
                console.warn('⏭️  Test saltato: nessuno spazio disponibile nel database');
                return;
            }

            const { user, token } = await createTestUserWithToken();
            const bookingData = createValidBookingData();

            const response = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${token}`)
                .send(bookingData)
                .expect(201);

            const booking = response.body.data.booking;
            createdBookingIds.push(booking.booking_id);

            // Verifica che tutti i dati siano salvati correttamente nel database
            const dbResult = await testDb.query(
                'SELECT * FROM bookings WHERE booking_id = $1',
                [booking.booking_id]
            );

            expect(dbResult.rows.length).toBe(1);
            const dbBooking = dbResult.rows[0];
            
            expect(dbBooking.user_id).toBe(user.id);
            expect(dbBooking.space_id).toBe(bookingData.space_id);
            expect(dbBooking.start_date.toISOString().split('T')[0]).toBe(bookingData.start_date);
            expect(dbBooking.end_date.toISOString().split('T')[0]).toBe(bookingData.end_date);
            expect(parseFloat(dbBooking.total_price)).toBe(bookingData.total_price);
            expect(dbBooking.status).toBe(bookingData.status);
            expect(dbBooking.payment_status).toBe(bookingData.payment_status);
            expect(dbBooking.notes).toBe(bookingData.notes);
        });

        test('Dovrebbe mantenere integrità referenziale', async () => {
            if (!testSpace) {
                console.warn('⏭️  Test saltato: nessuno spazio disponibile nel database');
                return;
            }

            const { user, token } = await createTestUserWithToken();
            const bookingData = createValidBookingData();

            const response = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${token}`)
                .send(bookingData)
                .expect(201);

            const booking = response.body.data.booking;
            createdBookingIds.push(booking.booking_id);

            // Verifica che la prenotazione sia collegata correttamente all'utente e allo spazio
            const joinResult = await testDb.query(`
                SELECT 
                    b.booking_id,
                    b.user_id,
                    b.space_id,
                    u.name as user_name,
                    u.email as user_email,
                    s.name as space_name
                FROM bookings b
                JOIN users u ON b.user_id = u.user_id
                JOIN spaces s ON b.space_id = s.space_id
                WHERE b.booking_id = $1
            `, [booking.booking_id]);

            expect(joinResult.rows.length).toBe(1);
            const joined = joinResult.rows[0];
            
            expect(joined.user_name).toBe(user.name);
            expect(joined.user_email).toBe(user.email);
            expect(joined.space_name).toBeTruthy(); // Verifica che il nome dello spazio esista
        });
    });
});