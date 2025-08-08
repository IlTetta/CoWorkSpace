// src/backend/server.js

const dotenv = require('dotenv');
dotenv.config();

const app = require('./app'); // Importa l'applicazione Express
const db = require('./config/db'); // Importa configurazione database

// Imposta la porta del server. Utilizza la variabile d'ambiente PORT o 3000 come default
const PORT = process.env.PORT || 3000;

// Funzione per avvio server con gestione errori
const startServer = async () => {
    try {
        // Inizializza database
        console.log('[SERVER] Inizializzazione del database...');
        await db.initialize();
        
        // Avvia il server
        const server = app.listen(PORT, () => {
            console.log(`[SERVER] Server in ascolto sulla porta ${PORT}`);
            console.log(`[SERVER] Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log(`[SERVER] PID: ${process.pid}`);
        });

        // Gestione graceful shutdown
        const gracefulShutdown = async (signal) => {
            console.log(`[SERVER] Ricevuto segnale ${signal}, avvio graceful shutdown...`);
            
            // Chiudi server HTTP
            server.close(async () => {
                console.log('[SERVER] Server HTTP chiuso');
                
                // Chiudi pool database
                await db.closePool();
                
                console.log('[SERVER] Graceful shutdown completato');
                process.exit(0);
            });

            // Forza chiusura dopo 10 secondi
            setTimeout(() => {
                console.error('[SERVER] Forceful shutdown dopo timeout');
                process.exit(1);
            }, 10000);
        };

        // Event listeners per graceful shutdown
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Gestione errori non catturati
        process.on('uncaughtException', (error) => {
            console.error('[SERVER] Uncaught Exception:', error);
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('[SERVER] Unhandled Rejection at:', promise, 'reason:', reason);
            gracefulShutdown('UNHANDLED_REJECTION');
        });

    } catch (error) {
        console.error('[SERVER] Errore durante l\'avvio del server:', error);
        process.exit(1);
    }
};

// Avvia il server
startServer();