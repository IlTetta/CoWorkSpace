const pool = require('../config/db');

class AdditionalService {
    /**
     * Crea un nuovo servizio aggiuntivo
     * @param {Object} serviceData - Dati del servizio
     * @returns {Promise<Object>} Servizio creato
     */
    static async create(serviceData) {
        const { service_name, description, price, is_active = true } = serviceData;

        const query = `
            INSERT INTO additional_services (service_name, description, price, is_active)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const result = await pool.query(query, [service_name, description, price, is_active]);
        return result.rows[0];
    }

    /**
     * Trova tutti i servizi aggiuntivi con filtri opzionali
     * @param {Object} filters - Filtri di ricerca
     * @returns {Promise<Array>} Array dei servizi
     */
    static async findAll(filters = {}) {
        let query = 'SELECT * FROM additional_services';
        const queryParams = [];
        const conditions = [];
        let paramIndex = 1;

        // Filtro per is_active
        if (filters.is_active !== undefined) {
            conditions.push(`is_active = $${paramIndex++}`);
            queryParams.push(filters.is_active);
        }

        // Filtro per nome (ricerca parziale)
        if (filters.service_name) {
            conditions.push(`service_name ILIKE $${paramIndex++}`);
            queryParams.push(`%${filters.service_name}%`);
        }

        // Filtro per prezzo minimo
        if (filters.min_price !== undefined) {
            conditions.push(`price >= $${paramIndex++}`);
            queryParams.push(filters.min_price);
        }

        // Filtro per prezzo massimo
        if (filters.max_price !== undefined) {
            conditions.push(`price <= $${paramIndex++}`);
            queryParams.push(filters.max_price);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ' ORDER BY service_name';

        const result = await pool.query(query, queryParams);
        return result.rows;
    }

    /**
     * Trova un servizio per ID
     * @param {number} serviceId - ID del servizio
     * @returns {Promise<Object|null>} Servizio trovato o null
     */
    static async findById(serviceId) {
        const query = 'SELECT * FROM additional_services WHERE service_id = $1';
        const result = await pool.query(query, [serviceId]);
        return result.rows[0] || null;
    }

    /**
     * Trova un servizio per nome
     * @param {string} serviceName - Nome del servizio
     * @returns {Promise<Object|null>} Servizio trovato o null
     */
    static async findByName(serviceName) {
        const query = 'SELECT * FROM additional_services WHERE service_name = $1';
        const result = await pool.query(query, [serviceName]);
        return result.rows[0] || null;
    }

    /**
     * Aggiorna un servizio esistente
     * @param {number} serviceId - ID del servizio
     * @param {Object} updateData - Dati da aggiornare
     * @returns {Promise<Object>} Servizio aggiornato
     */
    static async update(serviceId, updateData) {
        const updateFields = [];
        const queryParams = [serviceId];
        let paramIndex = 2;

        // Costruzione dinamica della query di aggiornamento
        if (updateData.service_name !== undefined) {
            updateFields.push(`service_name = $${paramIndex++}`);
            queryParams.push(updateData.service_name);
        }

        if (updateData.description !== undefined) {
            updateFields.push(`description = $${paramIndex++}`);
            queryParams.push(updateData.description);
        }

        if (updateData.price !== undefined) {
            updateFields.push(`price = $${paramIndex++}`);
            queryParams.push(updateData.price);
        }

        if (updateData.is_active !== undefined) {
            updateFields.push(`is_active = $${paramIndex++}`);
            queryParams.push(updateData.is_active);
        }

        if (updateFields.length === 0) {
            throw new Error('Nessun campo da aggiornare fornito');
        }

        const query = `
            UPDATE additional_services
            SET ${updateFields.join(', ')}
            WHERE service_id = $1
            RETURNING *
        `;

        const result = await pool.query(query, queryParams);
        return result.rows[0];
    }

    /**
     * Elimina un servizio
     * @param {number} serviceId - ID del servizio
     * @returns {Promise<boolean>} True se eliminato con successo
     */
    static async delete(serviceId) {
        const query = 'DELETE FROM additional_services WHERE service_id = $1 RETURNING *';
        const result = await pool.query(query, [serviceId]);
        return result.rows.length > 0;
    }

    /**
     * Associa un servizio a uno spazio
     * @param {number} spaceId - ID dello spazio
     * @param {number} serviceId - ID del servizio
     * @returns {Promise<boolean>} True se associazione creata
     */
    static async addToSpace(spaceId, serviceId) {
        const query = `
            INSERT INTO space_services (space_id, service_id)
            VALUES ($1, $2)
            RETURNING *
        `;

        const result = await pool.query(query, [spaceId, serviceId]);
        return result.rows.length > 0;
    }

    /**
     * Rimuove un servizio da uno spazio
     * @param {number} spaceId - ID dello spazio
     * @param {number} serviceId - ID del servizio
     * @returns {Promise<boolean>} True se associazione rimossa
     */
    static async removeFromSpace(spaceId, serviceId) {
        const query = `
            DELETE FROM space_services
            WHERE space_id = $1 AND service_id = $2
            RETURNING *
        `;

        const result = await pool.query(query, [spaceId, serviceId]);
        return result.rows.length > 0;
    }

    /**
     * Verifica se esiste un'associazione servizio-spazio
     * @param {number} spaceId - ID dello spazio
     * @param {number} serviceId - ID del servizio
     * @returns {Promise<boolean>} True se l'associazione esiste
     */
    static async checkSpaceServiceAssociation(spaceId, serviceId) {
        const query = `
            SELECT 1 FROM space_services
            WHERE space_id = $1 AND service_id = $2
        `;

        const result = await pool.query(query, [spaceId, serviceId]);
        return result.rows.length > 0;
    }

    /**
     * Trova tutti i servizi associati a uno spazio
     * @param {number} spaceId - ID dello spazio
     * @returns {Promise<Array>} Array dei servizi
     */
    static async findBySpace(spaceId) {
        const query = `
            SELECT ads.*
            FROM additional_services ads
            JOIN space_services ss ON ads.service_id = ss.service_id
            WHERE ss.space_id = $1 AND ads.is_active = TRUE
            ORDER BY ads.service_name
        `;

        const result = await pool.query(query, [spaceId]);
        return result.rows;
    }

    /**
     * Trova tutti gli spazi che utilizzano un servizio
     * @param {number} serviceId - ID del servizio
     * @returns {Promise<Array>} Array degli spazi
     */
    static async findSpacesByService(serviceId) {
        const query = `
            SELECT s.*, l.location_name, st.type_name
            FROM spaces s
            JOIN space_services ss ON s.space_id = ss.space_id
            JOIN locations l ON s.location_id = l.location_id
            JOIN space_types st ON s.space_type_id = st.space_type_id
            WHERE ss.service_id = $1
            ORDER BY l.location_name, s.space_name
        `;

        const result = await pool.query(query, [serviceId]);
        return result.rows;
    }

    /**
     * Ottiene tutte le associazioni servizio-spazio per un servizio
     * @param {number} serviceId - ID del servizio
     * @returns {Promise<Array>} Array delle associazioni
     */
    static async getServiceSpaceAssociations(serviceId) {
        const query = `
            SELECT ss.*, s.space_name, l.location_name
            FROM space_services ss
            JOIN spaces s ON ss.space_id = s.space_id
            JOIN locations l ON s.location_id = l.location_id
            WHERE ss.service_id = $1
        `;

        const result = await pool.query(query, [serviceId]);
        return result.rows;
    }

    /**
     * Calcola statistiche sui servizi aggiuntivi
     * @returns {Promise<Object>} Statistiche sui servizi
     */
    static async getStatistics() {
        const queries = [
            // Conteggio totale servizi
            'SELECT COUNT(*) as total_services FROM additional_services',
            
            // Conteggio servizi attivi
            'SELECT COUNT(*) as active_services FROM additional_services WHERE is_active = TRUE',
            
            // Servizio più utilizzato
            `SELECT ads.service_name, COUNT(ss.space_id) as usage_count
             FROM additional_services ads
             LEFT JOIN space_services ss ON ads.service_id = ss.service_id
             WHERE ads.is_active = TRUE
             GROUP BY ads.service_id, ads.service_name
             ORDER BY usage_count DESC
             LIMIT 1`,
            
            // Prezzo medio servizi
            'SELECT AVG(price) as average_price FROM additional_services WHERE is_active = TRUE',
            
            // Conteggio associazioni totali
            'SELECT COUNT(*) as total_associations FROM space_services'
        ];

        const results = await Promise.all(
            queries.map(query => pool.query(query))
        );

        return {
            totalServices: parseInt(results[0].rows[0].total_services),
            activeServices: parseInt(results[1].rows[0].active_services),
            mostUsedService: results[2].rows[0] || null,
            averagePrice: parseFloat(results[3].rows[0].average_price) || 0,
            totalAssociations: parseInt(results[4].rows[0].total_associations)
        };
    }

    /**
     * Cerca servizi per testo (nome o descrizione)
     * @param {string} searchText - Testo da cercare
     * @returns {Promise<Array>} Array dei servizi trovati
     */
    static async search(searchText) {
        const query = `
            SELECT *
            FROM additional_services
            WHERE is_active = TRUE
            AND (
                service_name ILIKE $1
                OR description ILIKE $1
            )
            ORDER BY service_name
        `;

        const result = await pool.query(query, [`%${searchText}%`]);
        return result.rows;
    }

    /**
     * Ottiene servizi disponibili per uno spazio (non ancora associati)
     * @param {number} spaceId - ID dello spazio
     * @returns {Promise<Array>} Array dei servizi disponibili
     */
    static async getAvailableServicesForSpace(spaceId) {
        const query = `
            SELECT ads.*
            FROM additional_services ads
            WHERE ads.is_active = TRUE
            AND ads.service_id NOT IN (
                SELECT service_id
                FROM space_services
                WHERE space_id = $1
            )
            ORDER BY ads.service_name
        `;

        const result = await pool.query(query, [spaceId]);
        return result.rows;
    }
}

module.exports = AdditionalService;
