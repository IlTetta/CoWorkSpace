// src/backend/server.js

const dotenv = require('dotenv');
dotenv.config();

const app = require('./app'); // Importa l'applicazione Express

// Imposta la porta del server. Utilizza la variabile d'ambiente PORT o 3000 come default
const PORT = process.env.PORT || 3000;

// Avvia il server
app.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});