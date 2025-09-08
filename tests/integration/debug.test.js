const request = require('supertest');
const app = require('../../src/backend/app');

describe('Debug Test', () => {
    it('should connect to API', async () => {
        const response = await request(app).get('/');
        console.log('Home page status:', response.status);
        expect(response.status).toBe(200);
    });

    it('should test API info endpoint', async () => {
        const response = await request(app).get('/api');
        console.log('API info:', response.status, response.body);
        expect(response.status).toBe(200);
    });

    it('should test registration with logging', async () => {
        const userData = {
            name: 'Test',
            surname: 'User',
            email: `test.debug.${Date.now()}@example.com`,
            password: 'Password123'
        };

        console.log('Sending registration data:', userData);

        const response = await request(app)
            .post('/api/users/register')
            .send(userData);

        console.log('Registration response status:', response.status);
        console.log('Registration response body:', response.body);
        
        // Non assertiamo per ora, solo guardiamo cosa succede
    });
});
