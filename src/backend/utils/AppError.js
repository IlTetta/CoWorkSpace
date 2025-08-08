// src/backend/utils/AppError.js

const { ERROR_CODES, ERROR_MESSAGES } = require('./errorCodes');

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
        return new AppError(message, 400, ERROR_CODES.VALIDATION_ERROR, details);
    }

    /**
     * Crea un errore di autenticazione (401)
     * @param {string} message - Messaggio di errore
     * @returns {AppError}
     */
    static unauthorized(message = ERROR_MESSAGES[ERROR_CODES.UNAUTHORIZED]) {
        return new AppError(message, 401, ERROR_CODES.UNAUTHORIZED, null);
    }

    /**
     * Crea un errore di accesso negato (403)
     * @param {string} message - Messaggio di errore
     * @returns {AppError}
     */
    static forbidden(message = ERROR_MESSAGES[ERROR_CODES.FORBIDDEN]) {
        return new AppError(message, 403, ERROR_CODES.FORBIDDEN, null);
    }

    /**
     * Crea un errore di risorsa non trovata (404)
     * @param {string} resource - Nome della risorsa
     * @returns {AppError}
     */
    static notFound(resource = 'Risorsa') {
        return new AppError(`${resource} non trovata`, 404, ERROR_CODES.NOT_FOUND, null);
    }

    /**
     * Crea un errore di conflitto (409)
     * @param {string} message - Messaggio di errore
     * @param {string} [code] - Codice specifico di conflitto
     * @returns {AppError}
     */
    static conflict(message, code = ERROR_CODES.CONFLICT) {
        return new AppError(message, 409, code, null);
    }

    /**
     * Crea un errore di business logic (422)
     * @param {string} message - Messaggio di errore
     * @param {Object} [details] - Dettagli dell'errore
     * @returns {AppError}
     */
    static businessRule(message, details = null) {
        return new AppError(message, 422, ERROR_CODES.BUSINESS_RULE_VIOLATION, details);
    }

    /**
     * Crea un errore interno del server (500)
     * @param {string} message - Messaggio di errore
     * @param {Object} [details] - Dettagli dell'errore
     * @returns {AppError}
     */
    static internal(message = ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR], details = null) {
        return new AppError(message, 500, ERROR_CODES.INTERNAL_ERROR, details);
    }

    /**
     * Crea un errore di database (500)
     * @param {string} message - Messaggio di errore
     * @param {Object} [details] - Dettagli dell'errore
     * @returns {AppError}
     */
    static database(message = 'Errore del database', details = null) {
        return new AppError(message, 500, ERROR_CODES.DATABASE_ERROR, details);
    }

    /**
     * Crea un errore per email duplicata
     * @param {string} email - Email duplicata
     * @returns {AppError}
     */
    static duplicateEmail(email) {
        return new AppError(
            `L'email ${email} è già registrata`,
            409,
            ERROR_CODES.DUPLICATE_EMAIL,
            { email }
        );
    }

    /**
     * Crea un errore per credenziali non valide
     * @returns {AppError}
     */
    static invalidCredentials() {
        return new AppError(
            'Email o password non corretti',
            401,
            ERROR_CODES.INVALID_CREDENTIALS,
            null
        );
    }

    /**
     * Crea un errore per token scaduto
     * @returns {AppError}
     */
    static tokenExpired() {
        return new AppError(
            'Token di accesso scaduto',
            401,
            ERROR_CODES.TOKEN_EXPIRED,
            null
        );
    }

    /**
     * Crea un errore per token non valido
     * @returns {AppError}
     */
    static tokenInvalid() {
        return new AppError(
            'Token di accesso non valido',
            401,
            ERROR_CODES.TOKEN_INVALID,
            null
        );
    }

    /**
     * Crea un errore per prenotazione non disponibile
     * @param {string} details - Dettagli sulla non disponibilità
     * @returns {AppError}
     */
    static bookingNotAvailable(details) {
        return new AppError(
            'Spazio non disponibile per il periodo selezionato',
            422,
            ERROR_CODES.BOOKING_NOT_AVAILABLE,
            details
        );
    }

    /**
     * Crea un errore da un errore di database PostgreSQL
     * @param {Error} pgError - Errore PostgreSQL
     * @returns {AppError}
     */
    static fromDatabaseError(pgError) {
        const { POSTGRES_ERROR_MAP } = require('./errorCodes');
        
        const code = POSTGRES_ERROR_MAP[pgError.code] || ERROR_CODES.DATABASE_ERROR;
        let message = ERROR_MESSAGES[code] || 'Errore del database';
        
        // Gestione specifica per errori comuni
        if (pgError.code === '23505') {
            // Unique violation
            if (pgError.constraint && pgError.constraint.includes('email')) {
                return AppError.duplicateEmail(pgError.detail);
            }
            message = 'Risorsa già esistente';
        }
        
        return new AppError(message, code === ERROR_CODES.VALIDATION_ERROR ? 400 : 500, code, {
            originalError: pgError.message,
            constraint: pgError.constraint,
            detail: pgError.detail
        });
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