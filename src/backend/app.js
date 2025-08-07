// src/backend/app.js

const express = require('express'); 
const cors = require('cors');
const rateLimit = require('express-rate-limit');
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

// --- Definizione delle rotte API ---
app.use('/api/users', userRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/space-types', spaceTypeRoutes);
app.use('/api/spaces', spaceRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/additional-services', additionalServiceRoutes);

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
    const status = err.status || 'error';
    
    // Risposta base
    const response = {
        status: status,
        message: err.isOperational ? err.message : 'Errore interno del server'
    };

    // Aggiungi dettagli in base all'ambiente e al tipo di errore
    if (process.env.NODE_ENV === 'development') {
        response.error = {
            name: err.name,
            stack: err.stack,
            code: err.code,
            details: err.details
        };
    } else if (err.isOperational && err.details) {
        // In produzione, includi solo dettagli da errori operazionali
        response.details = err.details;
    }

    res.status(statusCode).json(response);
});

// Esporta l'applicazione per poterla usare in server.js e nei test
module.exports = app;