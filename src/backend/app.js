// src/backend/app.js
const express = require('express'); 
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./config/db');
const ApiResponse = require('./utils/apiResponse');
const { specs, swaggerUi } = require('./config/swagger');

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
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Troppi tentativi di accesso. Riprova tra 15 minuti.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// --- Security Middleware ---
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            scriptSrc: isDevelopment ? ["'self'", "'unsafe-inline'"] : ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// --- CORS ---
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [];
        if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);

        if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
            callback(null, true); // permette tutte le origini in sviluppo
        } else {
            if (!origin || allowedOrigins.includes(origin)) callback(null, true);
            else callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// --- Rate Limiting su auth ---
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

// --- Health Check ---
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
        res.status(503).json({ status: 'ERROR', timestamp: new Date().toISOString(), error: error.message });
    }
});

// --- API Info ---
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
        docs: '/api-docs',
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

// --- Global Error Handler ---
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : 'Errore interno del server';
    const code = err.code || 'INTERNAL_ERROR';
    const details = process.env.NODE_ENV === 'development' ? { stack: err.stack } : null;
    return ApiResponse.error(res, statusCode, message, code, details);
});

module.exports = app;
