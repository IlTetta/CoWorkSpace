// src/backend/app.js

const express = require('express'); 
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const db = require('./config/db');
const ApiResponse = require('./utils/apiResponse');
const app = express();

// --- Importazione dei moduli delle rotte ---
const userRoutes = require('./routes/userRoutes');
const locationsRoutes = require('./routes/locationRoutes');
const spaceTypeRoutes = require('./routes/spaceTypeRoutes');
const spaceRoutes = require('./routes/spaceRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const additionalServiceRoutes = require('./routes/additionalServiceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// --- Rate Limiting ---
// Rate limiting generale per tutte le API
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 100, // 100 richieste per IP ogni 15 minuti
    message: {
        error: 'Troppe richieste da questo IP, riprova più tardi.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting stricter per operazioni di autenticazione
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 5, // Solo 5 tentativi di login per IP ogni 15 minuti
    message: {
        error: 'Troppi tentativi di accesso. Riprova tra 15 minuti.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(cors()); // Abilita CORS per tutte le rotte
app.use(express.json()); // Per gestire il JSON nel corpo delle richieste

// Applica rate limiting generale a tutte le rotte API
app.use('/api/', generalLimiter);

// Applica rate limiting specifico per auth
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);

// --- Health Check Endpoint ---
app.get('/health', async (req, res) => {
    try {
        const dbHealth = await db.healthCheck();
        const poolStats = db.getPoolStats();
        
        const healthStatus = {
            status: dbHealth.status === 'healthy' ? 'OK' : 'ERROR',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            database: dbHealth,
            connectionPool: poolStats,
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        };

        const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(healthStatus);
    } catch (error) {
        res.status(503).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// --- API Info Endpoint ---
app.get('/api', (req, res) => {
    res.json({
        name: 'CoWorkSpace API',
        version: process.env.npm_package_version || '1.0.0',
        description: 'API per la gestione di spazi co-working',
        endpoints: {
            auth: '/api/users',
            locations: '/api/locations',
            spaces: '/api/spaces',
            'space-types': '/api/space-types',
            availability: '/api/availability',
            bookings: '/api/bookings',
            payments: '/api/payments',
            'additional-services': '/api/additional-services',
            notifications: '/api/notifications'
        },
        docs: '/api/docs', // Per future implementazioni
        health: '/health'
    });
});

// --- Definizione delle rotte API ---
app.use('/api/users', userRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/space-types', spaceTypeRoutes);
app.use('/api/spaces', spaceRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/additional-services', additionalServiceRoutes);
app.use('/api/notifications', notificationRoutes);

// --- Gestione globale degli errori ---
app.use((err, req, res, next) => {
    // Log completo dell'errore per debugging
    const errorInfo = {
        timestamp: new Date().toISOString(),
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    };

    // Determina se è un errore operazionale o di sistema
    if (err.isOperational) {
        // Errore operazionale (AppError) - log meno verboso
        console.error(`[OPERATIONAL ERROR] ${err.message}`, {
            ...errorInfo,
            statusCode: err.statusCode,
            code: err.code
        });
    } else {
        // Errore di sistema - log completo con stack trace
        console.error(`[SYSTEM ERROR] ${err.message}`, {
            ...errorInfo,
            stack: err.stack,
            error: err
        });
    }

    // Determina status code e messaggio per la risposta
    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : 'Errore interno del server';
    const code = err.code || 'INTERNAL_ERROR';
    
    // Dettagli dell'errore (solo in development o per errori operazionali)
    let details = null;
    if (process.env.NODE_ENV === 'development') {
        details = {
            name: err.name,
            stack: err.stack,
            originalError: err.details
        };
    } else if (err.isOperational && err.details) {
        details = err.details;
    }

    // Utilizza ApiResponse per risposta standardizzata
    return ApiResponse.error(res, statusCode, message, code, details);
});

// Esporta l'applicazione per poterla usare in server.js e nei test
module.exports = app;