// Helper per configurare l'app Express nei test di integrazione
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Mock del rate limiter per i test
jest.mock('express-rate-limit', () => {
  return () => (req, res, next) => next(); // Bypass del rate limiting nei test
});

// Mock del middleware di autenticazione per i test
jest.mock('../../src/backend/middleware/authMiddleware', () => ({
  protect: (req, res, next) => {
    // Simula un utente autenticato se il token è presente
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Simula diversi utenti basati sul token
      if (token === 'mock-admin-token') {
        req.user = { user_id: 1, role: 'admin', email: 'admin@test.com' };
      } else if (token === 'mock-manager-token') {
        req.user = { user_id: 2, role: 'manager', email: 'manager@test.com' };
      } else if (token === 'mock-user-token') {
        req.user = { user_id: 3, role: 'user', email: 'user@test.com' };
      } else {
        return res.status(401).json({ 
          status: 'error', 
          message: 'Token non valido' 
        });
      }
    } else {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Token di autenticazione richiesto' 
      });
    }
    next();
  },
  authorize: (...roles) => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Utente non autenticato' 
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Non autorizzato per questo ruolo' 
      });
    }
    next();
  }
}));

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
  app.use('/api/spaces', require('../../src/backend/routes/spaceRoutes'));
  app.use('/api/manager', require('../../src/backend/routes/managerRoutes'));
  app.use('/api/admin', require('../../src/backend/routes/adminRoutes'));
  app.use('/api/locations', require('../../src/backend/routes/locationRoutes'));
  app.use('/api/space-types', require('../../src/backend/routes/spaceTypeRoutes'));
  app.use('/api/availability', require('../../src/backend/routes/availabilityRoutes'));
  app.use('/api/payments', require('../../src/backend/routes/paymentRoutes'));
  app.use('/api/notifications', require('../../src/backend/routes/notificationRoutes'));

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
