// Helper per configurare l'app Express nei test di integrazione
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Mock del rate limiter per i test
jest.mock('express-rate-limit', () => {
  return () => (req, res, next) => next(); // Bypass del rate limiting nei test
});

const createTestApp = () => {
  const app = express();

  // Middleware base
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use('/api/users', require('../../src/backend/routes/userRoutes'));
  app.use('/api/bookings', require('../../src/backend/routes/bookingRoutes'));

  // Error handler globale per i test
  app.use((error, req, res, next) => {
    console.error('Test Error:', error);
    
    const status = error.status || error.statusCode || 500;
    const message = error.message || 'Errore interno del server';
    
    res.status(status).json({
      success: false,
      status: 'error',
      message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'test' && { stack: error.stack })
    });
  });

  return app;
};

module.exports = { createTestApp };
