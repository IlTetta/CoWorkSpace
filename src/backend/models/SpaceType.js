const pool = require('../config/db');

/**
 * Modello per la gestione dei tipi di spazio
 * Implementa il pattern Repository per astrarre l'accesso ai dati
 */
class SpaceType {
    /**
     * Trova tutti i tipi di spazio con filtri opzionali
     * @param {Object} filters - Filtri di ricerca
     * @returns {Promise<Array>} Array di tutti i tipi di spazio
     */
    static async findAll(filters = {}) {
        let query = 'SELECT * FROM space_types';
        const queryParams = [];
        const conditions = [];
        let paramIndex = 1;

        // Filtro per nome (ricerca parziale)
        if (filters.type_name) {
            conditions.push(`type_name ILIKE $${paramIndex++}`);
            queryParams.push(`%${filters.type_name}%`);
        }

        // Filtro per descrizione
        if (filters.description) {
            conditions.push(`description ILIKE $${paramIndex++}`);
            queryParams.push(`%${filters.description}%`);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ' ORDER BY type_name';

        const result = await pool.query(query, queryParams);
        return result.rows;
    }

    /**
     * Trova un tipo di spazio per ID
     * @param {number} id - ID del tipo di spazio
     * @returns {Promise<Object|null>} Oggetto tipo di spazio o null se non trovato
     */
    static async findById(id) {
        const result = await pool.query('SELECT * FROM space_types WHERE space_type_id = $1', [id]);
        return result.rows[0] || null;
    }

    /**
     * Trova un tipo di spazio per nome
     * @param {string} typeName - Nome del tipo di spazio
     * @returns {Promise<Object|null>} Oggetto tipo di spazio o null se non trovato
     */
    static async findByName(typeName) {
        const result = await pool.query('SELECT * FROM space_types WHERE type_name = $1', [typeName]);
        return result.rows[0] || null;
    }

    /**
     * Crea un nuovo tipo di spazio
     * @param {Object} spaceTypeData - Dati del tipo di spazio
     * @param {string} spaceTypeData.type_name - Nome del tipo di spazio
     * @param {string} [spaceTypeData.description] - Descrizione del tipo di spazio
     * @returns {Promise<Object>} Nuovo tipo di spazio creato
     * @throws {Error} Se il nome esiste già (codice 23505)
     */
    static async create(spaceTypeData) {
        const { type_name, description } = spaceTypeData;
        
        // Validazione base
        if (!type_name) {
            throw new Error('Il nome del tipo di spazio è obbligatorio');
        }

        const result = await pool.query(
            'INSERT INTO space_types (type_name, description) VALUES ($1, $2) RETURNING *',
            [type_name, description]
        );
        
        return result.rows[0];
    }

    /**
     * Aggiorna un tipo di spazio esistente
     * @param {number} id - ID del tipo di spazio da aggiornare
     * @param {Object} updateData - Dati da aggiornare
     * @param {string} [updateData.type_name] - Nuovo nome del tipo di spazio
     * @param {string} [updateData.description] - Nuova descrizione del tipo di spazio
     * @returns {Promise<Object|null>} Tipo di spazio aggiornato o null se non trovato
     * @throws {Error} Se il nome esiste già (codice 23505)
     */
    static async update(id, updateData) {
        const { type_name, description } = updateData;
        
        // Costruisce la query dinamicamente
        const updateFields = [];
        const queryParams = [id];
        let queryIndex = 2;

        if (type_name !== undefined && type_name !== '') {
            updateFields.push(`type_name = $${queryIndex++}`);
            queryParams.push(type_name);
        }
        
        if (description !== undefined && description !== '') {
            updateFields.push(`description = $${queryIndex++}`);
            queryParams.push(description);
        }

        // Se non ci sono campi da aggiornare, restituisce il record esistente
        if (updateFields.length === 0) {
            return await this.findById(id);
        }

        const query = `UPDATE space_types SET ${updateFields.join(', ')} WHERE space_type_id = $1 RETURNING *`;
        const result = await pool.query(query, queryParams);
        
        return result.rows[0] || null;
    }

    /**
     * Elimina un tipo di spazio
     * @param {number} id - ID del tipo di spazio da eliminare
     * @returns {Promise<boolean>} True se eliminato con successo
     */
    static async delete(id) {
        const result = await pool.query('DELETE FROM space_types WHERE space_type_id = $1 RETURNING *', [id]);
        return result.rows.length > 0;
    }

    /**
     * Ottiene tutti gli spazi che utilizzano un tipo specifico
     * @param {number} spaceTypeId - ID del tipo di spazio
     * @returns {Promise<Array>} Array degli spazi che utilizzano questo tipo
     */
    static async getSpacesUsingType(spaceTypeId) {
        const query = `
            SELECT s.*, l.location_name
            FROM spaces s
            JOIN locations l ON s.location_id = l.location_id
            WHERE s.space_type_id = $1
            ORDER BY l.location_name, s.space_name
        `;

        const result = await pool.query(query, [spaceTypeId]);
        return result.rows;
    }

    /**
     * Ottiene statistiche sui tipi di spazio
     * @returns {Promise<Object>} Statistiche sui tipi di spazio
     */
    static async getStatistics() {
        const queries = [
            // Conteggio totale tipi di spazio
            'SELECT COUNT(*) as total_space_types FROM space_types',
            
            // Tipo più utilizzato
            `SELECT st.type_name, COUNT(s.space_id) as usage_count
             FROM space_types st
             LEFT JOIN spaces s ON st.space_type_id = s.space_type_id
             GROUP BY st.space_type_id, st.type_name
             ORDER BY usage_count DESC
             LIMIT 1`,
            
            // Conteggio spazi per tipo
            `SELECT st.type_name, COUNT(s.space_id) as spaces_count
             FROM space_types st
             LEFT JOIN spaces s ON st.space_type_id = s.space_type_id
             GROUP BY st.space_type_id, st.type_name
             ORDER BY spaces_count DESC`,
             
            // Tipi non utilizzati
            `SELECT COUNT(*) as unused_types
             FROM space_types st
             LEFT JOIN spaces s ON st.space_type_id = s.space_type_id
             WHERE s.space_id IS NULL`
        ];

        const results = await Promise.all(
            queries.map(query => pool.query(query))
        );

        return {
            totalSpaceTypes: parseInt(results[0].rows[0].total_space_types),
            mostUsedType: results[1].rows[0] || null,
            spacesByType: results[2].rows,
            unusedTypes: parseInt(results[3].rows[0].unused_types)
        };
    }

    /**
     * Recupera i tipi di spazio più popolari
     * @param {number} limit - Numero massimo di risultati
     * @returns {Promise<Array>} Array dei tipi di spazio più utilizzati
     */
    static async getMostPopular(limit = 5) {
        const query = `
            SELECT st.*, COUNT(s.space_id) as spaces_count
            FROM space_types st
            LEFT JOIN spaces s ON st.space_type_id = s.space_type_id
            GROUP BY st.space_type_id, st.type_name, st.description
            ORDER BY spaces_count DESC, st.type_name
            LIMIT $1
        `;

        const result = await pool.query(query, [limit]);
        return result.rows;
    }

    /**
     * Aggiorna l'ordine di visualizzazione dei tipi di spazio
     * @param {Array} orderedIds - Array degli ID nell'ordine desiderato
     * @returns {Promise<Array>} Array dei tipi aggiornati
     */
    static async updateDisplayOrder(orderedIds) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            const updatedTypes = [];
            
            for (let i = 0; i < orderedIds.length; i++) {
                const result = await client.query(
                    'UPDATE space_types SET display_order = $1 WHERE space_type_id = $2 RETURNING *',
                    [i + 1, orderedIds[i]]
                );
                
                if (result.rows[0]) {
                    updatedTypes.push(result.rows[0]);
                }
            }
            
            await client.query('COMMIT');
            return updatedTypes;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Verifica se un tipo di spazio esiste
     * @param {number} id - ID del tipo di spazio
     * @returns {Promise<boolean>} True se esiste, false altrimenti
     */
    static async exists(id) {
        const result = await pool.query('SELECT 1 FROM space_types WHERE space_type_id = $1', [id]);
        return result.rows.length > 0;
    }

    /**
     * Conta il numero totale di tipi di spazio
     * @returns {Promise<number>} Numero totale di tipi di spazio
     */
    static async count() {
        const result = await pool.query('SELECT COUNT(*) as count FROM space_types');
        return parseInt(result.rows[0].count, 10);
    }

    /**
     * Trova tipi di spazio con ricerca testuale
     * @param {string} searchTerm - Termine di ricerca
     * @returns {Promise<Array>} Array di tipi di spazio che corrispondono alla ricerca
     */
    static async search(searchTerm) {
        const result = await pool.query(
            'SELECT * FROM space_types WHERE type_name ILIKE $1 OR description ILIKE $1 ORDER BY type_name',
            [`%${searchTerm}%`]
        );
        return result.rows;
    }
}

module.exports = SpaceType;
