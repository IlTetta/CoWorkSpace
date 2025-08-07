// src/backend/utils/errorCodes.js

/**
 * Costanti per codici di errore dell'applicazione
 * Facilitano il debugging e la categorizzazione degli errori
 */

const ERROR_CODES = {
    // Errori di validazione (400)
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
    INVALID_FORMAT: 'INVALID_FORMAT',
    INVALID_INPUT: 'INVALID_INPUT',

    // Errori di autenticazione (401)
    UNAUTHORIZED: 'UNAUTHORIZED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',

    // Errori di autorizzazione (403)
    FORBIDDEN: 'FORBIDDEN',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    ROLE_NOT_ALLOWED: 'ROLE_NOT_ALLOWED',

    // Errori di risorsa (404)
    NOT_FOUND: 'NOT_FOUND',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

    // Errori di conflitto (409)
    CONFLICT: 'CONFLICT',
    DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
    RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
    BOOKING_CONFLICT: 'BOOKING_CONFLICT',

    // Errori di business logic (422)
    BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
    INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
    BOOKING_NOT_AVAILABLE: 'BOOKING_NOT_AVAILABLE',
    INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',

    // Errori di rate limiting (429)
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

    // Errori interni del server (500)
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
    CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',

    // Errori di servizio non disponibile (503)
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    MAINTENANCE_MODE: 'MAINTENANCE_MODE',
    DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE'
};

/**
 * Messaggi di errore per l'utente finale
 */
const ERROR_MESSAGES = {
    [ERROR_CODES.VALIDATION_ERROR]: 'Dati di input non validi',
    [ERROR_CODES.MISSING_REQUIRED_FIELDS]: 'Campi obbligatori mancanti',
    [ERROR_CODES.INVALID_CREDENTIALS]: 'Credenziali non valide',
    [ERROR_CODES.UNAUTHORIZED]: 'Accesso non autorizzato',
    [ERROR_CODES.FORBIDDEN]: 'Accesso negato',
    [ERROR_CODES.NOT_FOUND]: 'Risorsa non trovata',
    [ERROR_CODES.DUPLICATE_EMAIL]: 'Email già registrata',
    [ERROR_CODES.CONFLICT]: 'Conflitto con una risorsa esistente',
    [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Troppe richieste, riprova più tardi',
    [ERROR_CODES.INTERNAL_ERROR]: 'Errore interno del server',
    [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Servizio temporaneamente non disponibile'
};

/**
 * Mappa codici di errore PostgreSQL a codici di errore dell'applicazione
 */
const POSTGRES_ERROR_MAP = {
    '23505': ERROR_CODES.DUPLICATE_EMAIL, // Unique violation
    '23503': ERROR_CODES.VALIDATION_ERROR, // Foreign key violation
    '23514': ERROR_CODES.VALIDATION_ERROR, // Check violation
    '23502': ERROR_CODES.MISSING_REQUIRED_FIELDS, // Not null violation
    '08003': ERROR_CODES.DATABASE_UNAVAILABLE, // Connection does not exist
    '08006': ERROR_CODES.DATABASE_UNAVAILABLE, // Connection failure
    '57014': ERROR_CODES.DATABASE_ERROR, // Query canceled
    '53300': ERROR_CODES.DATABASE_ERROR // Too many connections
};

module.exports = {
    ERROR_CODES,
    ERROR_MESSAGES,
    POSTGRES_ERROR_MAP
};
