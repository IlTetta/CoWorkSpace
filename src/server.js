const dotenv = require('dotenv'); // Importa il modulo dotenv per caricare le variabili d'ambiente
dotenv.config(); // Carica le variabili d'ambiente

const express = require('express'); // Importa il framework Express per costruire il server web
const  app = express(); // Crea un'applicazione Express
const db = require('./backend/config/db'); // Importa la configurazione del database

// --- Importazione dei moduli delle rotte ---
const userRoutes = require('./backend/routes/userRoutes');
const locationsRoutes = require('./backend/routes/locationRoutes');
const spaceTypeRoutes = require('./backend/routes/spaceTypeRoutes');
const spaceRoutes = require('./backend/routes/spaceRoutes');
const availabilityRoutes = require('./backend/routes/availabilityRoutes');
const bookingRoutes = require('./backend/routes/bookingRoutes');
const paymentRoutes = require('./backend/routes/paymentRoutes');
const additionalServiceRoutes  = require('./backend/routes/additionalServiceRoutes');


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

// Imposta la porta del server. Utilizza la varibile d'ambiente PORT o 3000 come default
const PORT = process.env.PORT || 3000;

// Avvia il server
app.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});

// --- Gestione globale degli errori ---
// Middleware per la gestione degli errori
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        message: err.message || 'Errore interno del server',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});
