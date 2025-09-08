const request = require('supertest');
const app = require('../../src/backend/app');
const { cleanupTestData, createTestUser, generateTestEmail } = require('../helpers/testHelpers');

describe('Authentication Integration Tests', () => {
    // Aumentiamo il timeout per i test di integrazione
    jest.setTimeout(30000);
    
    // Setup e cleanup del database per i test
    beforeAll(async () => {
        // Cleanup dei dati di test prima di iniziare
        await cleanupTestData();
    });

    afterAll(async () => {
        // Cleanup finale
        await cleanupTestData();
    });

    describe('POST /api/users/register', () => {
        const validUserData = {
            name: 'Mario',
            surname: 'Rossi',
            email: generateTestEmail('mario.register'),
            password: 'Password123'
        };

        it('should register a new user successfully', async () => {
            const response = await request(app)
                .post('/api/users/register')
                .send(validUserData);

            expect(response.status).toBe(201);
            expect(response.body.status).toBe('success');
            expect(response.body.data.user).toHaveProperty('user_id');
            expect(response.body.data.user.email).toBe(validUserData.email);
            expect(response.body.data.user.name).toBe(validUserData.name);
            expect(response.body.data.user.role).toBe('user');
            expect(response.body.data).toHaveProperty('token');

            // Verifica che la password non sia esposta
            expect(response.body.data.user).not.toHaveProperty('password');
            expect(response.body.data.user).not.toHaveProperty('password_hash');
        });

        it('should not register user with invalid email', async () => {
            const invalidData = {
                ...validUserData,
                email: 'invalid-email'
            };

            const response = await request(app)
                .post('/api/users/register')
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('fail');
        });

        it('should not register user with weak password', async () => {
            const weakPasswordData = {
                ...validUserData,
                password: '123'
            };

            const response = await request(app)
                .post('/api/users/register')
                .send(weakPasswordData);

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('fail');
        });

        it('should not register duplicate email', async () => {
            // Prima registrazione
            await request(app)
                .post('/api/users/register')
                .send(validUserData);

            // Tentativo di duplicazione
            const response = await request(app)
                .post('/api/users/register')
                .send(validUserData);

            expect(response.status).toBe(409);
            expect(response.body.status).toBe('fail');
        });

        it('should not register user with missing required fields', async () => {
            const incompleteData = {
                name: 'Mario',
                email: generateTestEmail('mario.incomplete')
                // mancano surname e password
            };

            const response = await request(app)
                .post('/api/users/register')
                .send(incompleteData);

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('fail');
        });
    });

    describe('POST /api/users/login', () => {
        const testUser = {
            name: 'Mario',
            surname: 'Rossi',
            email: generateTestEmail('mario.login'),
            password: 'Password123'
        };

        beforeEach(async () => {
            // Crea un utente per il test di login
            await request(app)
                .post('/api/users/register')
                .send(testUser);
        });

        it('should login user with valid credentials', async () => {
            const loginData = {
                email: testUser.email,
                password: testUser.password
            };

            const response = await request(app)
                .post('/api/users/login')
                .send(loginData);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.user.email).toBe(testUser.email);
            expect(response.body.data).toHaveProperty('token');
            
            // Verifica che la password non sia esposta
            expect(response.body.data.user).not.toHaveProperty('password');
            expect(response.body.data.user).not.toHaveProperty('password_hash');
        });

        it('should not login with invalid email', async () => {
            const invalidLogin = {
                email: 'nonexistent@example.com',
                password: 'Password123'
            };

            const response = await request(app)
                .post('/api/users/login')
                .send(invalidLogin);

            expect(response.status).toBe(401);
            expect(response.body.status).toBe('fail');
        });

        it('should not login with invalid password', async () => {
            const invalidLogin = {
                email: testUser.email,
                password: 'WrongPassword123'
            };

            const response = await request(app)
                .post('/api/users/login')
                .send(invalidLogin);

            expect(response.status).toBe(401);
            expect(response.body.status).toBe('fail');
        });

        it('should not login with missing credentials', async () => {
            const response = await request(app)
                .post('/api/users/login')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('fail');
        });
    });

    describe('GET /api/users/profile', () => {
        const testUser = {
            name: 'Mario',
            surname: 'Rossi',
            email: generateTestEmail('mario.profile'),
            password: 'Password123'
        };
        
        let authToken;

        beforeEach(async () => {
            // Registra e logga l'utente per ottenere il token
            const registerResponse = await request(app)
                .post('/api/users/register')
                .send(testUser);
            
            authToken = registerResponse.body.data.token;
        });

        it('should get user profile with valid token', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data.user.email).toBe(testUser.email);
            expect(response.body.data.user.name).toBe(testUser.name);
            expect(response.body.data.user.surname).toBe(testUser.surname);
            expect(response.body.data.user).not.toHaveProperty('password_hash');
        });

        it('should not get profile without token', async () => {
            const response = await request(app)
                .get('/api/users/profile');

            expect(response.status).toBe(401);
            expect(response.body.status).toBe('fail');
        });

        it('should not get profile with invalid token', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', 'Bearer invalid-token');

            expect(response.status).toBe(401);
            expect(response.body.status).toBe('fail');
        });
    });

    describe('Rate Limiting Tests', () => {
        it('should apply rate limiting to login attempts', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'WrongPassword123'
            };

            // Fai 6 tentativi rapidi (il limite è 5)
            const requests = [];
            for (let i = 0; i < 6; i++) {
                requests.push(
                    request(app)
                        .post('/api/users/login')
                        .send(loginData)
                );
            }

            const responses = await Promise.all(requests);
            
            // I primi 5 dovrebbero restituire 401 (credenziali sbagliate)
            // Il 6° dovrebbe restituire 429 (rate limit)
            const rateLimitedResponse = responses.find(res => res.status === 429);
            expect(rateLimitedResponse).toBeDefined();
        });
    });
});
