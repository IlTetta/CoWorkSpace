// src/backend/utils/AppError.js

/**
 * Classe personalizzata per gestire errori operazionali dell'applicazione
 * @extends Error
 */
class AppError extends Error {
    /**
     * @param {string} message - Messaggio di errore
     * @param {number} statusCode - Codice di stato HTTP
     * @param {string} [code] - Codice errore specifico per categorizzazione
     * @param {Object} [details] - Dettagli aggiuntivi dell'errore
     */
    constructor(message, statusCode, code = null, details = null) {
        super(message);
        
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
        
        // Cattura stack trace escludendo questo constructor
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Crea un errore di validazione (400)
     * @param {string} message - Messaggio di errore
     * @param {Object} [details] - Dettagli di validazione
     * @returns {AppError}
     */
    static badRequest(message, details = null) {
        return new AppError(message, 400, 'VALIDATION_ERROR', details);
    }

    /**
     * Crea un errore di autenticazione (401)
     * @param {string} message - Messaggio di errore
     * @returns {AppError}
     */
    static unauthorized(message = 'Non autorizzato') {
        return new AppError(message, 401, 'UNAUTHORIZED', null);
    }

    /**
     * Crea un errore di accesso negato (403)
     * @param {string} message - Messaggio di errore
     * @returns {AppError}
     */
    static forbidden(message = 'Accesso negato') {
        return new AppError(message, 403, 'FORBIDDEN', null);
    }

    /**
     * Crea un errore di risorsa non trovata (404)
     * @param {string} resource - Nome della risorsa
     * @returns {AppError}
     */
    static notFound(resource = 'Risorsa') {
        return new AppError(`${resource} non trovata`, 404, 'NOT_FOUND', null);
    }

    /**
     * Crea un errore di conflitto (409)
     * @param {string} message - Messaggio di errore
     * @returns {AppError}
     */
    static conflict(message) {
        return new AppError(message, 409, 'CONFLICT', null);
    }

    /**
     * Crea un errore interno del server (500)
     * @param {string} message - Messaggio di errore
     * @param {Object} [details] - Dettagli dell'errore
     * @returns {AppError}
     */
    static internal(message = 'Errore interno del server', details = null) {
        return new AppError(message, 500, 'INTERNAL_ERROR', details);
    }

    /**
     * Serializza l'errore per il logging
     * @returns {Object}
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            statusCode: this.statusCode,
            status: this.status,
            code: this.code,
            details: this.details,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

module.exports = AppError;