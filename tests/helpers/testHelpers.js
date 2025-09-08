const request = require('supertest');
const app = require('../../src/backend/app');
const pool = require('../../src/backend/config/db');

/**
 * Helper per creare un utente di test e ottenere il token di autenticazione
 */
async function createTestUser(userData = {}) {
    const defaultUser = {
        name: 'Test',
        surname: 'User',
        email: `test.${Date.now()}@example.com`,
        password: 'Password123'
    };

    const user = { ...defaultUser, ...userData };

    const response = await request(app)
        .post('/api/users/register')
        .send(user);

    if (response.status !== 201) {
        throw new Error(`Failed to create test user: ${response.body.message}`);
    }

    return {
        user: response.body.data.user,
        token: response.body.data.token,
        originalPassword: user.password
    };
}

/**
 * Helper per fare login di un utente esistente
 */
async function loginUser(email, password) {
    const response = await request(app)
        .post('/api/users/login')
        .send({ email, password });

    if (response.status !== 200) {
        throw new Error(`Failed to login user: ${response.body.message}`);
    }

    return {
        user: response.body.data.user,
        token: response.body.data.token
    };
}

/**
 * Helper per pulire i dati di test dal database
 */
async function cleanupTestData() {
    try {
        // Usa i nomi delle colonne corretti dal database
        const pool = require('../../src/backend/config/db');
        
        // Pulisce solo gli utenti di test (manteniamo semplice per ora)
        await pool.query('DELETE FROM users WHERE email LIKE $1', ['%test%']);
        
        console.log('Test data cleanup completed');
    } catch (error) {
        console.error('Error during cleanup:', error.message);
        // Non lanciamo l'errore per evitare di bloccare i test
    }
}

/**
 * Helper per creare dati di test per location
 */
async function createTestLocation(authToken, locationData = {}) {
    const defaultLocation = {
        name: `Test Location ${Date.now()}`,
        address: 'Via Test 123, Roma',
        city: 'Roma',
        postal_code: '00100',
        country: 'Italia',
        description: 'Location di test per integration tests'
    };

    const location = { ...defaultLocation, ...locationData };

    const response = await request(app)
        .post('/api/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(location);

    if (response.status !== 201) {
        throw new Error(`Failed to create test location: ${response.body.message}`);
    }

    return response.body.data.location;
}

/**
 * Helper per creare un tipo di spazio di test
 */
async function createTestSpaceType(authToken, spaceTypeData = {}) {
    const defaultSpaceType = {
        name: `Test Space Type ${Date.now()}`,
        description: 'Tipo di spazio per test',
        default_capacity: 4,
        default_hourly_rate: 25.00
    };

    const spaceType = { ...defaultSpaceType, ...spaceTypeData };

    const response = await request(app)
        .post('/api/space-types')
        .set('Authorization', `Bearer ${authToken}`)
        .send(spaceType);

    if (response.status !== 201) {
        throw new Error(`Failed to create test space type: ${response.body.message}`);
    }

    return response.body.data.spaceType;
}

/**
 * Helper per creare uno spazio di test
 */
async function createTestSpace(authToken, spaceData = {}) {
    const defaultSpace = {
        name: `Test Space ${Date.now()}`,
        description: 'Spazio di test per integration tests',
        capacity: 4,
        hourly_rate: 25.00,
        amenities: ['Wi-Fi', 'Proiettore'],
        is_active: true
    };

    const space = { ...defaultSpace, ...spaceData };

    const response = await request(app)
        .post('/api/spaces')
        .set('Authorization', `Bearer ${authToken}`)
        .send(space);

    if (response.status !== 201) {
        throw new Error(`Failed to create test space: ${response.body.message}`);
    }

    return response.body.data.space;
}

/**
 * Helper per aspettare un certo tempo (utile per rate limiting tests)
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper per generare email random per i test
 */
function generateTestEmail(prefix = 'test') {
    return `${prefix}.${Date.now()}.${Math.random().toString(36).substr(2, 5)}@example.com`;
}

module.exports = {
    createTestUser,
    loginUser,
    cleanupTestData,
    createTestLocation,
    createTestSpaceType,
    createTestSpace,
    wait,
    generateTestEmail
};
