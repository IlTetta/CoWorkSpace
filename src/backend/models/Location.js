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
     * Trova tutte le locations con ordinamento avanzato
     * @param {Object} filters - Filtri di ricerca
     * @param {string} sortBy - Campo per ordinamento ('name', 'city', 'date')
     * @param {string} sortOrder - Ordine ('asc', 'desc')
     * @returns {Promise<Location[]>} - Array di locations ordinate
     */
    static async findAllWithSorting(filters = {}, sortBy = 'name', sortOrder = 'asc') {
        let query = `
            SELECT l.location_id, l.location_name, l.address, l.city, l.description, l.manager_id,
                   u.name as manager_name, u.surname as manager_surname 
            FROM locations l
            LEFT JOIN users u ON l.manager_id = u.user_id
        `;
        
        const conditions = [];
        const values = [];

        // Filtro per città (ricerca esatta)
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

        // Costruisci l'ordinamento
        let orderClause = '';
        switch (sortBy) {
            case 'name':
                orderClause = `l.location_name ${sortOrder.toUpperCase()}`;
                break;
            case 'city':
                orderClause = `l.city ${sortOrder.toUpperCase()}, l.location_name ASC`;
                break;
            case 'date':
                // Assumendo che location_id sia auto-incrementale e rappresenti l'ordine di inserimento
                orderClause = `l.location_id ${sortOrder.toUpperCase()}`;
                break;
            default:
                orderClause = 'l.location_name ASC';
        }

        query += ` ORDER BY ${orderClause}`;

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
            return location.toJSON();
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
     * Ottieni tutti gli spazi di una location con i loro dettagli
     * @param {number} locationId - ID della location
     * @returns {Promise<Array>} - Array di spazi con dettagli
     */
    static async getLocationSpaces(locationId) {
        const query = `
            SELECT 
                s.space_id,
                s.space_name,
                s.description,
                s.capacity,
                s.price_per_hour,
                s.price_per_day,
                st.type_name as space_type,
                st.description as space_type_description,
                -- Statistiche dello spazio
                COUNT(b.booking_id) as total_bookings,
                COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
                COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as space_revenue
            FROM spaces s
            LEFT JOIN space_types st ON s.space_type_id = st.space_type_id
            LEFT JOIN bookings b ON s.space_id = b.space_id
            LEFT JOIN payments p ON b.booking_id = p.booking_id
            WHERE s.location_id = $1
            GROUP BY s.space_id, s.space_name, s.description, s.capacity, s.price_per_hour, s.price_per_day, st.type_name, st.description
            ORDER BY s.space_name
        `;

        const result = await db.query(query, [locationId]);
        return result.rows.map(row => ({
            id: row.space_id,
            name: row.space_name,
            description: row.description,
            capacity: row.capacity,
            pricePerHour: parseFloat(row.price_per_hour),
            pricePerDay: parseFloat(row.price_per_day),
            spaceType: {
                name: row.space_type,
                description: row.space_type_description
            },
            statistics: {
                totalBookings: parseInt(row.total_bookings),
                confirmedBookings: parseInt(row.confirmed_bookings),
                revenue: parseFloat(row.space_revenue)
            }
        }));
    }

    /**
     * Ottieni statistiche dettagliate di una location
     * @param {number} locationId - ID della location
     * @returns {Promise<Object>} - Statistiche dettagliate
     */
    static async getLocationStatistics(locationId) {
        const queries = {
            overview: `
                SELECT 
                    COUNT(DISTINCT s.space_id) as total_spaces,
                    COUNT(DISTINCT b.booking_id) as total_bookings,
                    COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.booking_id END) as confirmed_bookings,
                    COUNT(DISTINCT CASE WHEN b.status = 'pending' THEN b.booking_id END) as pending_bookings,
                    COUNT(DISTINCT CASE WHEN b.status = 'cancelled' THEN b.booking_id END) as cancelled_bookings,
                    COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as total_revenue,
                    AVG(s.price_per_hour) as avg_price_per_hour,
                    MAX(s.capacity) as max_capacity,
                    MIN(s.capacity) as min_capacity,
                    AVG(s.capacity) as avg_capacity
                FROM spaces s
                LEFT JOIN bookings b ON s.space_id = b.space_id
                LEFT JOIN payments p ON b.booking_id = p.booking_id
                WHERE s.location_id = $1
            `,
            monthlyRevenue: `
                SELECT 
                    EXTRACT(YEAR FROM p.payment_date) as year,
                    EXTRACT(MONTH FROM p.payment_date) as month,
                    SUM(p.amount) as revenue,
                    COUNT(p.payment_id) as payments_count
                FROM payments p
                JOIN bookings b ON p.booking_id = b.booking_id
                JOIN spaces s ON b.space_id = s.space_id
                WHERE s.location_id = $1 AND p.status = 'completed'
                AND p.payment_date >= CURRENT_DATE - INTERVAL '12 months'
                GROUP BY EXTRACT(YEAR FROM p.payment_date), EXTRACT(MONTH FROM p.payment_date)
                ORDER BY year DESC, month DESC
                LIMIT 12
            `,
            topSpaces: `
                SELECT 
                    s.space_name,
                    COUNT(b.booking_id) as booking_count,
                    COALESCE(SUM(p.amount), 0) as revenue
                FROM spaces s
                LEFT JOIN bookings b ON s.space_id = b.space_id AND b.status = 'confirmed'
                LEFT JOIN payments p ON b.booking_id = p.booking_id AND p.status = 'completed'
                WHERE s.location_id = $1
                GROUP BY s.space_id, s.space_name
                ORDER BY booking_count DESC, revenue DESC
                LIMIT 5
            `
        };

        const results = {};
        
        for (const [key, query] of Object.entries(queries)) {
            try {
                const result = await db.query(query, [locationId]);
                results[key] = result.rows;
            } catch (error) {
                if (error.code === '42P01' || error.code === '42703') {
                    results[key] = key === 'overview' ? [{}] : [];
                } else {
                    throw error;
                }
            }
        }

        // Formatta i risultati
        const overview = results.overview[0] || {};
        return {
            totalSpaces: parseInt(overview.total_spaces) || 0,
            totalBookings: parseInt(overview.total_bookings) || 0,
            confirmedBookings: parseInt(overview.confirmed_bookings) || 0,
            pendingBookings: parseInt(overview.pending_bookings) || 0,
            cancelledBookings: parseInt(overview.cancelled_bookings) || 0,
            totalRevenue: parseFloat(overview.total_revenue) || 0,
            averagePricePerHour: parseFloat(overview.avg_price_per_hour) || 0,
            capacityRange: {
                min: parseInt(overview.min_capacity) || 0,
                max: parseInt(overview.max_capacity) || 0,
                average: parseFloat(overview.avg_capacity) || 0
            },
            monthlyRevenue: results.monthlyRevenue.map(row => ({
                year: parseInt(row.year),
                month: parseInt(row.month),
                revenue: parseFloat(row.revenue),
                paymentsCount: parseInt(row.payments_count)
            })),
            topSpaces: results.topSpaces.map(row => ({
                spaceName: row.space_name,
                bookingCount: parseInt(row.booking_count),
                revenue: parseFloat(row.revenue)
            }))
        };
    }

    /**
     * Ottieni le prenotazioni recenti di una location
     * @param {number} locationId - ID della location
     * @returns {Promise<Array>} - Array di prenotazioni recenti
     */
    static async getLocationRecentBookings(locationId) {
        const query = `
            SELECT 
                b.booking_id,
                b.booking_date,
                b.start_time,
                b.end_time,
                b.total_hours,
                b.total_price,
                b.status,
                b.created_at,
                s.space_name,
                u.name as user_name,
                u.surname as user_surname,
                u.email as user_email,
                p.status as payment_status,
                p.payment_method
            FROM bookings b
            JOIN spaces s ON b.space_id = s.space_id
            JOIN users u ON b.user_id = u.user_id
            LEFT JOIN payments p ON b.booking_id = p.booking_id
            WHERE s.location_id = $1
            ORDER BY b.created_at DESC
            LIMIT 20
        `;

        const result = await db.query(query, [locationId]);
        return result.rows.map(row => ({
            id: row.booking_id,
            date: row.booking_date,
            startTime: row.start_time,
            endTime: row.end_time,
            totalHours: parseFloat(row.total_hours),
            totalPrice: parseFloat(row.total_price),
            status: row.status,
            createdAt: row.created_at,
            space: {
                name: row.space_name
            },
            user: {
                name: row.user_name,
                surname: row.user_surname,
                email: row.user_email
            },
            payment: {
                status: row.payment_status,
                method: row.payment_method
            }
        }));
    }

    /**
     * Ottieni i tipi di spazio disponibili in una location
     * @param {number} locationId - ID della location
     * @returns {Promise<Array>} - Array di tipi di spazio
     */
    static async getLocationSpaceTypes(locationId) {
        const query = `
            SELECT DISTINCT
                st.space_type_id,
                st.type_name,
                st.description,
                COUNT(s.space_id) as spaces_count,
                MIN(s.price_per_hour) as min_price_hour,
                MAX(s.price_per_hour) as max_price_hour,
                AVG(s.price_per_hour) as avg_price_hour,
                MIN(s.capacity) as min_capacity,
                MAX(s.capacity) as max_capacity
            FROM space_types st
            JOIN spaces s ON st.space_type_id = s.space_type_id
            WHERE s.location_id = $1
            GROUP BY st.space_type_id, st.type_name, st.description
            ORDER BY st.type_name
        `;

        const result = await db.query(query, [locationId]);
        return result.rows.map(row => ({
            id: row.space_type_id,
            name: row.type_name,
            description: row.description,
            spacesCount: parseInt(row.spaces_count),
            priceRange: {
                min: parseFloat(row.min_price_hour),
                max: parseFloat(row.max_price_hour),
                average: parseFloat(row.avg_price_hour)
            },
            capacityRange: {
                min: parseInt(row.min_capacity),
                max: parseInt(row.max_capacity)
            }
        }));
    }

    /**
     * Ottieni i servizi aggiuntivi disponibili per gli spazi di una location
     * @param {number} locationId - ID della location
     * @returns {Promise<Array>} - Array di servizi disponibili
     */
    static async getLocationAvailableServices(locationId) {
        const query = `
            SELECT DISTINCT
                ads.service_id,
                ads.service_name,
                ads.description,
                ads.price,
                ads.is_active,
                COUNT(ss.space_id) as spaces_with_service
            FROM additional_services ads
            JOIN space_services ss ON ads.service_id = ss.service_id
            JOIN spaces s ON ss.space_id = s.space_id
            WHERE s.location_id = $1 AND ads.is_active = true
            GROUP BY ads.service_id, ads.service_name, ads.description, ads.price, ads.is_active
            ORDER BY ads.service_name
        `;

        const result = await db.query(query, [locationId]);
        return result.rows.map(row => ({
            id: row.service_id,
            name: row.service_name,
            description: row.description,
            price: parseFloat(row.price),
            isActive: row.is_active,
            spacesWithService: parseInt(row.spaces_with_service)
        }));
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
