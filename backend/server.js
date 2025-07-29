const express = require('express');
const app = express();
const dotenv = require('dotenv');
const db = require('./config/db');

const userRoutes = require('./routes/userRoutes');
const locationsRoutes = require('./routes/locationRoutes');
const spaceTypeRoutes = require('./routes/spaceTypeRoutes');

dotenv.config(); // Load environment variables

app.use(express.json()); // Middleware to parse JSON bodies
app.use('/api/users', userRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/space-types', spaceTypeRoutes);


// Rotta di prova
app.get('/', (req, res) => {
    res.send('Benvenuto in CoWorkSpace API!');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        message: err.message || 'Errore interno del server',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});
