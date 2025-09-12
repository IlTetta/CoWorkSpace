// tests/setup-integration.js
// Setup specifico per i test di integrazione con database reale

const dotenv = require('dotenv');

// Carica le variabili d'ambiente per i test
dotenv.config({ path: '.env.test' });

// Fallback alle variabili di ambiente standard se quelle di test non esistono
if (!process.env.TEST_DB_NAME && process.env.DB_DATABASE) {
    process.env.TEST_DB_NAME = process.env.DB_DATABASE + '_test';
}

// Imposta l'ambiente come test
process.env.NODE_ENV = 'test';

// Configurazione variabili di ambiente necessarie per i test
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Mock di Firebase Admin per evitare invio email reali durante i test
jest.mock('firebase-admin', () => ({
    initializeApp: jest.fn(),
    credential: {
        cert: jest.fn(),
    },
    messaging: jest.fn(() => ({
        send: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
        sendMulticast: jest.fn().mockResolvedValue({ 
            successCount: 1, 
            failureCount: 0,
            responses: [{ messageId: 'test-message-id' }]
        }),
    })),
}));

// Mock delle email per evitare invii reali durante i test
jest.mock('nodemailer', () => ({
    createTransporter: jest.fn(() => ({
        sendMail: jest.fn().mockResolvedValue({
            messageId: 'test-email-id',
            response: 'Test email sent'
        })
    }))
}));

// Configurazione globale per i test di integrazione
global.console = {
    ...console,
    // Mantieni i log per i test di integrazione (utili per debugging)
    log: jest.fn((...args) => {
        if (process.env.TEST_VERBOSE === 'true') {
            console.info(...args);
        }
    }),
    error: jest.fn((...args) => {
        if (process.env.TEST_VERBOSE === 'true') {
            console.info('[ERROR]', ...args);
        }
    }),
    warn: jest.fn((...args) => {
        if (process.env.TEST_VERBOSE === 'true') {
            console.info('[WARN]', ...args);
        }
    }),
};

// Timeout più lungo per i test di integrazione
jest.setTimeout(30000);

// Setup e teardown globali per i test di integrazione
beforeAll(async () => {
    console.log('🚀 Avvio setup globale test di integrazione');
});

afterAll(async () => {
    console.log('🏁 Completato teardown globale test di integrazione');
});

// Handler per gestire i cleanup in caso di errori non gestiti
process.on('unhandledRejection', (reason, promise) => {
    console.error('[TEST] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('[TEST] Uncaught Exception:', error);
});