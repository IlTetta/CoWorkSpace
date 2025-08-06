// src/backend/app.js

const express = require('express'); 
const cors = require('cors');
const app = express();
const db = require('./config/db'); 

// --- Importazione dei moduli delle rotte ---
const userRoutes = require('./routes/userRoutes');
const locationsRoutes = require('./routes/locationRoutes');
const spaceTypeRoutes = require('./routes/spaceTypeRoutes');
const spaceRoutes = require('./routes/spaceRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const additionalServiceRoutes = require('./routes/additionalServiceRoutes');

app.use(cors()); // Abilita CORS per tutte le rotte
app.use(express.json()); // Per gestire il JSON nel corpo delle richieste

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
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        message: err.message || 'Errore interno del server',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Esporta l'applicazione per poterla usare in server.js e nei test
module.exports = app;