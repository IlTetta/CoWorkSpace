// src/backend/app.js

const express = require('express'); 
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./config/db');
const ApiResponse = require('./utils/apiResponse');
const { specs, swaggerUi } = require('./config/swagger');
const path = require('path');
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
const managerRoutes = require('./routes/managerRoutes');
const adminRoutes = require('./routes/adminRoutes');

// --- Rate Limiting ---
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

// --- Security Middleware ---
// Headers di sicurezza con Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            // Fix this line
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false // For Swagger UI
}));

// CORS configurato in modo sicuro
const corsOptions = {
    origin: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : false),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Limite dimensione payload

/**
 * @swagger
 * /:
 *   get:
 *     summary: Pagina principale dell'applicazione
 *     tags: [General]
 *     responses:
 *       200:
 *         description: Restituisce la pagina HTML principale
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/home.html'));
});

app.use(express.static(path.join(__dirname, '../frontend')));

// Applica rate limiting specifico per auth
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);

// --- Swagger Documentation ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'CoWorkSpace API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        docExpansion: 'none',
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1
    }
}));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Endpoint di health check del sistema
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Sistema funzionante
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: 'OK'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Tempo di attività in secondi
 *                 memory:
 *                   type: object
 *                   properties:
 *                     rss:
 *                       type: number
 *                     heapTotal:
 *                       type: number
 *                     heapUsed:
 *                       type: number
 *                     external:
 *                       type: number
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: 'healthy'
 *                     responseTime:
 *                       type: number
 *                     connections:
 *                       type: number
 *                 connectionPool:
 *                   type: object
 *                   properties:
 *                     totalConnections:
 *                       type: number
 *                     idleConnections:
 *                       type: number
 *                     waitingCount:
 *                       type: number
 *                 version:
 *                   type: string
 *                   example: '1.0.0'
 *                 environment:
 *                   type: string
 *                   example: 'development'
 *       503:
 *         description: Sistema non funzionante
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: 'ERROR'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 error:
 *                   type: string
 *                   description: Dettagli dell'errore
 */
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

/**
 * @swagger
 * /api:
 *   get:
 *     summary: Informazioni generali sull'API
 *     tags: [API Info]
 *     responses:
 *       200:
 *         description: Informazioni API e lista degli endpoint disponibili
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: 'CoWorkSpace API'
 *                 version:
 *                   type: string
 *                   example: '1.0.0'
 *                 description:
 *                   type: string
 *                   example: 'API per la gestione di spazi co-working'
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     auth:
 *                       type: string
 *                       example: '/api/users'
 *                     locations:
 *                       type: string
 *                       example: '/api/locations'
 *                     spaces:
 *                       type: string
 *                       example: '/api/spaces'
 *                     space-types:
 *                       type: string
 *                       example: '/api/space-types'
 *                     availability:
 *                       type: string
 *                       example: '/api/availability'
 *                     bookings:
 *                       type: string
 *                       example: '/api/bookings'
 *                     payments:
 *                       type: string
 *                       example: '/api/payments'
 *                     additional-services:
 *                       type: string
 *                       example: '/api/additional-services'
 *                     notifications:
 *                       type: string
 *                       example: '/api/notifications'
 *                 docs:
 *                   type: string
 *                   example: '/api-docs'
 *                   description: 'URL della documentazione Swagger'
 *                 health:
 *                   type: string
 *                   example: '/health'
 *                   description: 'URL del health check'
 */
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
            notifications: '/api/notifications',
            manager: '/api/manager',
            admin: '/api/admin'
        },
        docs: '/api-docs', // Documentazione Swagger
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
app.use('/api/manager', managerRoutes);
app.use('/api/admin', adminRoutes);

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