const pool = require('../config/db');

/**
 * Modello per la gestione dei tipi di spazio
 * Implementa il pattern Repository per astrarre l'accesso ai dati
 */
class SpaceType {
    /**
     * Trova tutti i tipi di spazio
     * @returns {Promise<Array>} Array di tutti i tipi di spazio
     */
    static async findAll() {
        const result = await pool.query('SELECT * FROM space_types');
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
     * @returns {Promise<Object|null>} Tipo di spazio eliminato o null se non trovato
     */
    static async delete(id) {
        const result = await pool.query('DELETE FROM space_types WHERE space_type_id = $1 RETURNING *', [id]);
        return result.rows[0] || null;
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
