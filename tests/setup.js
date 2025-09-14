// Jest setup file

// Mock di pg prima di qualsiasi import
jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
    processID: 'test-process-id'
  };
  
  const mockPool = {
    connect: jest.fn().mockResolvedValue(mockClient),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(), // Mock per event listeners
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
    options: {
      max: 20,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    }
  };
  
  return {
    Pool: jest.fn(() => mockPool),
  };
});

// Mock del modulo di configurazione database
jest.mock('../src/backend/config/db.js', () => ({
  query: jest.fn(),
  transaction: jest.fn(),
  pool: {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  },
  testConnection: jest.fn().mockResolvedValue(true),
  closePool: jest.fn(),
  healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' }),
  getPoolStats: jest.fn().mockReturnValue({}),
  initialize: jest.fn().mockResolvedValue(true)
}));

// Mock di dotenv
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

// Mock di Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
  messaging: jest.fn(() => ({
    send: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  })),
}));

// Mock variabili di ambiente per i test
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '24h';

// Configurazione globale per i test
global.console = {
  ...console,
  // Nascondi i log durante i test (opzionale)
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Aumenta il timeout per i test
jest.setTimeout(30000);
