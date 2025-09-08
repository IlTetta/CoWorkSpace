const request = require('supertest');
const app = require('../../src/backend/app');
const pool = require('../../src/backend/config/db');

describe('Simple Authentication Test', () => {
    jest.setTimeout(30000);

    it('should register a new user successfully', async () => {
        const validUserData = {
            name: 'Mario',
            surname: 'Rossi',
            email: `mario.simple.test.${Date.now()}@example.com`,
            password: 'Password123!', // Aggiungiamo carattere speciale
            role: 'user' // Aggiungiamo il ruolo
        };

        const response = await request(app)
            .post('/api/users/register')
            .send(validUserData);

        // Debug: stampiamo la risposta se il test fallisce
        if (response.status !== 201) {
            console.log('Registration failed:', response.status, response.body);
        }

        expect(response.status).toBe(201);
        expect(response.body.status).toBe('success');
        expect(response.body.data.user).toHaveProperty('id'); // È 'id', non 'user_id'
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
            name: 'Mario',
            surname: 'Rossi',
            email: 'invalid-email',
            password: 'Password123!',
            role: 'user'
        };

        const response = await request(app)
            .post('/api/users/register')
            .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.status).toBe('fail');
    });

    it('should login with valid credentials', async () => {
        // Prima registra un utente
        const testUser = {
            name: 'Login',
            surname: 'Test',
            email: `login.simple.test.${Date.now()}@example.com`,
            password: 'Password123!',
            role: 'user'
        };

        await request(app)
            .post('/api/users/register')
            .send(testUser);

        // Poi prova il login
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
    });

    it('should get user profile with valid token', async () => {
        // Registra e logga un utente
        const testUser = {
            name: 'Profile',
            surname: 'Test',
            email: `profile.simple.test.${Date.now()}@example.com`,
            password: 'Password123!',
            role: 'user'
        };

        const registerResponse = await request(app)
            .post('/api/users/register')
            .send(testUser);

        const authToken = registerResponse.body.data.token;

        // Testa l'accesso al profilo
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
});
