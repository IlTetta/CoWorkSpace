// src/backend/models/Location.js
const db = require('../config/db');
const AppError = require('../utils/AppError');

/**
 * Classe Location per gestire le sedi del coworking
 */
class Location {
    constructor(data) {
        this.location_id = data.location_id;
        this.location_name = data.location_name;
        this.address = data.address;
        this.city = data.city;
        this.description = data.description;
        this.manager_id = data.manager_id;
    }

    /**
     * Crea una nuova location
     * @param {Object} locationData - Dati della location
     * @returns {Promise<Location>} - Location creata
     */
    static async create(locationData) {
        const { location_name, address, city, description, manager_id } = locationData;

        // Validazione input
        this.validateLocationData(locationData);

        const query = `
            INSERT INTO locations (location_name, address, city, description, manager_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        try {
            const result = await db.query(query, [
                location_name,
                address,
                city,
                description,
                manager_id
            ]);

            return new Location(result.rows[0]);
        } catch (error) {
            if (error.code === '23505') { // Violazione unique constraint
                throw AppError.badRequest('Una location con questo nome esiste già');
            }
            if (error.code === '23503') { // Foreign key violation
                throw AppError.badRequest('Manager non valido');
            }
            throw error;
        }
    }

    /**
     * Trova location per ID
     * @param {number} id - ID della location
     * @returns {Promise<Location|null>} - Location trovata o null
     */
    static async findById(id) {
        const query = `
            SELECT l.*, u.name as manager_name, u.surname as manager_surname, u.email as manager_email
            FROM locations l
            LEFT JOIN users u ON l.manager_id = u.user_id
            WHERE l.location_id = $1
        `;

        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }

        const locationData = result.rows[0];
        const location = new Location(locationData);
        
        // Aggiungi dati del manager se presente
        if (locationData.manager_name) {
            location.manager = {
                id: locationData.manager_id,
                name: locationData.manager_name,
                surname: locationData.manager_surname,
                email: locationData.manager_email
            };
        }

        return location;
    }

    /**
     * Trova tutte le locations
     * @param {Object} filters - Filtri di ricerca
     * @returns {Promise<Location[]>} - Array di locations
     */
    static async findAll(filters = {}) {
        let query = `
            SELECT l.*, u.name as manager_name, u.surname as manager_surname 
            FROM locations l
            LEFT JOIN users u ON l.manager_id = u.user_id
        `;
        
        const conditions = [];
        const values = [];

        // Filtro per città
        if (filters.city) {
            conditions.push(`LOWER(l.city) = LOWER($${values.length + 1})`);
            values.push(filters.city);
        }

        // Filtro per nome (ricerca parziale)
        if (filters.name) {
            conditions.push(`LOWER(l.location_name) LIKE LOWER($${values.length + 1})`);
            values.push(`%${filters.name}%`);
        }

        // Filtro per manager
        if (filters.manager_id) {
            conditions.push(`l.manager_id = $${values.length + 1}`);
            values.push(filters.manager_id);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY l.location_name';

        const result = await db.query(query, values);

        return result.rows.map(row => {
            const location = new Location(row);
            if (row.manager_name) {
                location.manager = {
                    id: row.manager_id,
                    name: row.manager_name,
                    surname: row.manager_surname
                };
            }
            return location;
        });
    }

    /**
     * Aggiorna una location
     * @param {number} id - ID della location
     * @param {Object} updateData - Dati da aggiornare
     * @returns {Promise<Location>} - Location aggiornata
     */
    static async update(id, updateData) {
        // Validazione input
        this.validateLocationData(updateData, true);

        const fields = [];
        const values = [];
        let paramCount = 1;

        // Costruisci query dinamicamente
        for (const [key, value] of Object.entries(updateData)) {
            if (['location_name', 'address', 'city', 'description', 'manager_id'].includes(key)) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (fields.length === 0) {
            throw AppError.badRequest('Nessun campo valido da aggiornare');
        }

        values.push(id); // ID per WHERE clause

        const query = `
            UPDATE locations 
            SET ${fields.join(', ')} 
            WHERE location_id = $${paramCount}
            RETURNING *
        `;

        try {
            const result = await db.query(query, values);
            
            if (result.rows.length === 0) {
                throw AppError.notFound('Location non trovata');
            }

            return new Location(result.rows[0]);
        } catch (error) {
            if (error.code === '23505') {
                throw AppError.badRequest('Una location con questo nome esiste già');
            }
            if (error.code === '23503') {
                throw AppError.badRequest('Manager non valido');
            }
            throw error;
        }
    }

    /**
     * Elimina una location
     * @param {number} id - ID della location
     * @returns {Promise<boolean>} - true se eliminata
     */
    static async delete(id) {
        // Verifica se ci sono spazi associati
        const spacesQuery = 'SELECT COUNT(*) as count FROM spaces WHERE location_id = $1';
        const spacesResult = await db.query(spacesQuery, [id]);
        
        if (parseInt(spacesResult.rows[0].count) > 0) {
            throw AppError.badRequest('Impossibile eliminare: ci sono spazi associati a questa location');
        }

        const query = 'DELETE FROM locations WHERE location_id = $1 RETURNING location_id';
        const result = await db.query(query, [id]);

        if (result.rows.length === 0) {
            throw AppError.notFound('Location non trovata');
        }

        return true;
    }

    /**
     * Trova locations gestite da un manager
     * @param {number} managerId - ID del manager
     * @returns {Promise<Location[]>} - Array di locations
     */
    static async findByManager(managerId) {
        const query = `
            SELECT * FROM locations 
            WHERE manager_id = $1 
            ORDER BY location_name
        `;

        const result = await db.query(query, [managerId]);
        return result.rows.map(row => new Location(row));
    }

    /**
     * Ottieni statistiche di una location
     * @param {number} id - ID della location
     * @returns {Promise<Object>} - Statistiche della location
     */
    static async getStats(id) {
        const queries = {
            totalSpaces: 'SELECT COUNT(*) as count FROM spaces WHERE location_id = $1',
            totalBookings: 'SELECT COUNT(*) as count FROM bookings b JOIN spaces s ON b.space_id = s.space_id WHERE s.location_id = $1',
            activeBookings: `
                SELECT COUNT(*) as count 
                FROM bookings b 
                JOIN spaces s ON b.space_id = s.space_id 
                WHERE s.location_id = $1 AND b.status = 'confirmed'
            `,
            revenue: `
                SELECT COALESCE(SUM(amount), 0) as revenue 
                FROM payments p 
                JOIN bookings b ON p.booking_id = b.booking_id 
                JOIN spaces s ON b.space_id = s.space_id 
                WHERE s.location_id = $1 AND p.status = 'completed'
            `
        };

        const results = {};
        for (const [key, query] of Object.entries(queries)) {
            try {
                const result = await db.query(query, [id]);
                results[key] = result.rows[0].count || result.rows[0].revenue || 0;
            } catch (error) {
                // Se la tabella non esiste ancora, restituisci 0
                if (error.code === '42P01' || error.code === '42703') {
                    results[key] = 0;
                } else {
                    throw error;
                }
            }
        }

        return results;
    }

    /**
     * Validazione dati location
     * @param {Object} data - Dati da validare
     * @param {boolean} isUpdate - Se è un aggiornamento (campi opzionali)
     */
    static validateLocationData(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate || data.location_name !== undefined) {
            if (!data.location_name || data.location_name.trim().length < 2) {
                errors.push('Nome location deve essere di almeno 2 caratteri');
            }
            if (data.location_name && data.location_name.length > 255) {
                errors.push('Nome location troppo lungo (max 255 caratteri)');
            }
        }

        if (!isUpdate || data.address !== undefined) {
            if (!data.address || data.address.trim().length < 5) {
                errors.push('Indirizzo deve essere di almeno 5 caratteri');
            }
            if (data.address && data.address.length > 255) {
                errors.push('Indirizzo troppo lungo (max 255 caratteri)');
            }
        }

        if (!isUpdate || data.city !== undefined) {
            if (!data.city || data.city.trim().length < 2) {
                errors.push('Città deve essere di almeno 2 caratteri');
            }
            if (data.city && data.city.length > 100) {
                errors.push('Nome città troppo lungo (max 100 caratteri)');
            }
        }

        if (data.description && data.description.length > 1000) {
            errors.push('Descrizione troppo lunga (max 1000 caratteri)');
        }

        if (data.manager_id && (!Number.isInteger(data.manager_id) || data.manager_id <= 0)) {
            errors.push('ID manager non valido');
        }

        if (errors.length > 0) {
            throw AppError.badRequest(`Dati non validi: ${errors.join(', ')}`);
        }
    }

    /**
     * Serializzazione per JSON
     * @returns {Object} - Oggetto serializzato
     */
    toJSON() {
        return {
            id: this.location_id,
            name: this.location_name,
            address: this.address,
            city: this.city,
            description: this.description,
            managerId: this.manager_id,
            manager: this.manager
        };
    }
}

module.exports = Location;
