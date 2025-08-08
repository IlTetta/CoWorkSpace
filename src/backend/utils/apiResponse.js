// src/backend/utils/apiResponse.js

/**
 * Utility per standardizzare le risposte API
 * Fornisce metodi consistenti per success e error responses
 */
class ApiResponse {
    /**
     * Risposta di successo standardizzata
     * @param {Object} res - Response object di Express
     * @param {number} statusCode - Codice di stato HTTP
     * @param {string} message - Messaggio di successo
     * @param {Object} data - Dati da restituire
     * @param {Object} meta - Metadati aggiuntivi (paginazione, filtri, etc.)
     */
    static success(res, statusCode = 200, message = 'Operazione completata con successo', data = null, meta = null) {
        const response = {
            success: true,
            status: 'success',
            message,
            timestamp: new Date().toISOString()
        };

        if (data !== null) {
            response.data = data;
        }

        if (meta !== null) {
            response.meta = meta;
        }

        return res.status(statusCode).json(response);
    }

    /**
     * Risposta di errore standardizzata
     * @param {Object} res - Response object di Express
     * @param {number} statusCode - Codice di stato HTTP
     * @param {string} message - Messaggio di errore
     * @param {string} code - Codice di errore interno
     * @param {Object} details - Dettagli aggiuntivi dell'errore
     */
    static error(res, statusCode = 500, message = 'Si è verificato un errore', code = null, details = null) {
        const response = {
            success: false,
            status: 'error',
            message,
            timestamp: new Date().toISOString()
        };

        if (code) {
            response.code = code;
        }

        if (details && process.env.NODE_ENV === 'development') {
            response.details = details;
        }

        return res.status(statusCode).json(response);
    }

    /**
     * Risposta per creazione risorsa (201)
     */
    static created(res, message = 'Risorsa creata con successo', data = null) {
        return this.success(res, 201, message, data);
    }

    /**
     * Risposta per risorsa non trovata (404)
     */
    static notFound(res, message = 'Risorsa non trovata', code = 'NOT_FOUND') {
        return this.error(res, 404, message, code);
    }

    /**
     * Risposta per errore di validazione (400)
     */
    static badRequest(res, message = 'Dati non validi', details = null) {
        return this.error(res, 400, message, 'VALIDATION_ERROR', details);
    }

    /**
     * Risposta per errore di autenticazione (401)
     */
    static unauthorized(res, message = 'Accesso non autorizzato') {
        return this.error(res, 401, message, 'UNAUTHORIZED');
    }

    /**
     * Risposta per errore di autorizzazione (403)
     */
    static forbidden(res, message = 'Accesso negato') {
        return this.error(res, 403, message, 'FORBIDDEN');
    }

    /**
     * Risposta per conflitto (409)
     */
    static conflict(res, message = 'Conflitto con risorsa esistente') {
        return this.error(res, 409, message, 'CONFLICT');
    }

    /**
     * Risposta per errore interno del server (500)
     */
    static internalError(res, message = 'Errore interno del server') {
        return this.error(res, 500, message, 'INTERNAL_ERROR');
    }

    /**
     * Risposta paginata
     * @param {Object} res - Response object di Express
     * @param {Array} data - Array di dati
     * @param {Object} pagination - Informazioni di paginazione
     * @param {string} message - Messaggio di successo
     */
    static paginated(res, data, pagination, message = 'Dati recuperati con successo') {
        return this.success(res, 200, message, data, {
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: pagination.total,
                totalPages: Math.ceil(pagination.total / pagination.limit),
                hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
                hasPrev: pagination.page > 1
            }
        });
    }

    /**
     * Risposta con lista di elementi
     * @param {Object} res - Response object di Express
     * @param {Array} items - Lista di elementi
     * @param {string} message - Messaggio di successo
     * @param {Object} filters - Filtri applicati
     */
    static list(res, items, message = 'Lista recuperata con successo', filters = null) {
        const meta = {
            count: items.length,
            total: items.length
        };

        if (filters) {
            meta.filters = filters;
        }

        return this.success(res, 200, message, { items }, meta);
    }

    /**
     * Risposta per operazione di aggiornamento
     */
    static updated(res, data = null, message = 'Risorsa aggiornata con successo') {
        return this.success(res, 200, message, data);
    }

    /**
     * Risposta per operazione di eliminazione
     */
    static deleted(res, message = 'Risorsa eliminata con successo') {
        return this.success(res, 200, message);
    }

    /**
     * Risposta per operazioni senza contenuto (204)
     */
    static noContent(res) {
        return res.status(204).send();
    }
}

module.exports = ApiResponse;
