// src/backend/models/Booking.js
const pool = require('../config/db');
const AppError = require('../utils/AppError');

/**
 * Model per gestire le prenotazioni degli spazi di co-working
 */
class Booking {
    constructor(data) {
        this.booking_id = data.booking_id;
        this.user_id = data.user_id;
        this.space_id = data.space_id;
        this.booking_date = data.booking_date;
        this.start_time = data.start_time;
        this.end_time = data.end_time;
        this.total_hours = data.total_hours;
        this.total_price = data.total_price;
        this.status = data.status || 'pending';
        this.payment_status = data.payment_status || 'pending';
        this.notes = data.notes;
        this.created_at = data.created_at;
        
        // Campi enriched dai JOIN
        this.user_name = data.user_name;
        this.user_surname = data.user_surname;
        this.user_email = data.user_email;
        this.space_name = data.space_name;
        this.location_name = data.location_name;
        this.location_address = data.location_address;
    }

    // ============================================================================
    // CRUD OPERATIONS
    // ============================================================================

    /**
     * Crea una nuova prenotazione
     * @param {Object} bookingData - Dati della prenotazione
     * @returns {Promise<Booking>} - Prenotazione creata
     */
    static async create(bookingData) {
        const {
            user_id, space_id, booking_date, start_time, end_time,
            total_hours, total_price, status = 'pending'
        } = bookingData;

        // Validazione dati obbligatori
        this.validateBookingData(bookingData);

        // Verifica disponibilità prima di creare
        const isAvailable = await this.checkSpaceAvailability(
            space_id, booking_date, start_time, end_time
        );
        
        if (!isAvailable) {
            throw AppError.conflict('Lo spazio non è disponibile per l\'orario richiesto');
        }

        try {
            const query = `
                INSERT INTO bookings (
                    user_id, space_id, booking_date, start_time, end_time,
                    total_hours, total_price, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;
            
            const values = [
                user_id, space_id, booking_date, start_time, end_time,
                total_hours, total_price, status
            ];

            const result = await pool.query(query, values);
            const booking = new Booking(result.rows[0]);
            
            // Ottieni i dettagli completi
            return await this.findById(booking.booking_id);
        } catch (error) {
            if (error.code === '23503') { // Foreign key violation
                if (error.constraint?.includes('user_id')) {
                    throw AppError.badRequest('Utente non valido');
                }
                if (error.constraint?.includes('space_id')) {
                    throw AppError.badRequest('Spazio non valido');
                }
            }
            throw AppError.internal('Errore durante la creazione della prenotazione', error);
        }
    }

    /**
     * Trova prenotazione per ID con dettagli completi
     * @param {number} bookingId - ID della prenotazione
     * @returns {Promise<Booking|null>} - Prenotazione trovata o null
     */
    static async findById(bookingId) {
        try {
            const query = `
                SELECT 
                    b.*,
                    u.name as user_name,
                    u.surname as user_surname,
                    u.email as user_email,
                    s.space_name,
                    s.capacity as space_capacity,
                    s.price_per_hour,
                    s.price_per_day,
                    l.location_name,
                    l.address as location_address,
                    l.city as location_city
                FROM bookings b
                JOIN users u ON b.user_id = u.user_id
                JOIN spaces s ON b.space_id = s.space_id
                JOIN locations l ON s.location_id = l.location_id
                WHERE b.booking_id = $1
            `;

            const result = await pool.query(query, [bookingId]);
            
            if (result.rows.length === 0) {
                return null;
            }

            return new Booking(result.rows[0]);
        } catch (error) {
            throw AppError.internal('Errore durante la ricerca della prenotazione', error);
        }
    }

    /**
     * Trova tutte le prenotazioni con filtri
     * @param {Object} filters - Filtri di ricerca
     * @returns {Promise<Array<Booking>>} - Array di prenotazioni
     */
    static async findAll(filters = {}) {
        try {
            let query = `
                SELECT 
                    b.*,
                    u.name as user_name,
                    u.surname as user_surname,
                    u.email as user_email,
                    s.space_name,
                    l.location_name,
                    l.address as location_address
                FROM bookings b
                JOIN users u ON b.user_id = u.user_id
                JOIN spaces s ON b.space_id = s.space_id
                JOIN locations l ON s.location_id = l.location_id
                WHERE 1=1
            `;

            const values = [];
            let paramCount = 1;

            // Applica filtri
            if (filters.user_id) {
                query += ` AND b.user_id = $${paramCount++}`;
                values.push(filters.user_id);
            }

            if (filters.space_id) {
                query += ` AND b.space_id = $${paramCount++}`;
                values.push(filters.space_id);
            }

            if (filters.location_id) {
                if (Array.isArray(filters.location_id)) {
                    const placeholders = filters.location_id.map(() => `$${paramCount++}`).join(',');
                    query += ` AND l.location_id IN (${placeholders})`;
                    values.push(...filters.location_id);
                } else {
                    query += ` AND l.location_id = $${paramCount++}`;
                    values.push(filters.location_id);
                }
            }

            if (filters.status) {
                query += ` AND b.status = $${paramCount++}`;
                values.push(filters.status);
            }

            if (filters.payment_status) {
                query += ` AND b.payment_status = $${paramCount++}`;
                values.push(filters.payment_status);
            }

            if (filters.booking_date) {
                query += ` AND b.booking_date = $${paramCount++}`;
                values.push(filters.booking_date);
            }

            if (filters.date_from) {
                query += ` AND b.booking_date >= $${paramCount++}`;
                values.push(filters.date_from);
            }

            if (filters.date_to) {
                query += ` AND b.booking_date <= $${paramCount++}`;
                values.push(filters.date_to);
            }

            // Ordinamento
            query += ` ORDER BY b.booking_date DESC, b.start_time DESC`;

            // Limite risultati
            if (filters.limit) {
                query += ` LIMIT $${paramCount++}`;
                values.push(filters.limit);
            }

            const result = await pool.query(query, values);
            return result.rows.map(row => new Booking(row));
        } catch (error) {
            throw AppError.internal('Errore durante la ricerca delle prenotazioni', error);
        }
    }

    /**
     * Aggiorna una prenotazione
     * @param {number} bookingId - ID della prenotazione
     * @param {Object} updateData - Dati da aggiornare
     * @returns {Promise<Booking>} - Prenotazione aggiornata
     */
    static async update(bookingId, updateData) {
        // Verifica che la prenotazione esista
        const existing = await this.findById(bookingId);
        if (!existing) {
            throw AppError.notFound('Prenotazione non trovata');
        }

        // Campi aggiornabili
        const allowedFields = [
            'booking_date', 'start_time', 'end_time', 'total_hours', 
            'total_price', 'status', 'payment_status', 'notes'
        ];
        
        const fieldsToUpdate = [];
        const values = [];
        let paramCount = 1;

        // Costruisci query dinamicamente
        Object.keys(updateData).forEach(field => {
            if (allowedFields.includes(field) && updateData[field] !== undefined) {
                fieldsToUpdate.push(`${field} = $${paramCount++}`);
                values.push(updateData[field]);
            }
        });

        if (fieldsToUpdate.length === 0) {
            throw AppError.badRequest('Nessun campo valido da aggiornare');
        }

        // Verifica disponibilità se si modificano date/orari
        if (updateData.booking_date || updateData.start_time || updateData.end_time) {
            const newDate = updateData.booking_date || existing.booking_date;
            const newStartTime = updateData.start_time || existing.start_time;
            const newEndTime = updateData.end_time || existing.end_time;

            const isAvailable = await this.checkSpaceAvailability(
                existing.space_id, newDate, newStartTime, newEndTime, bookingId
            );
            
            if (!isAvailable) {
                throw AppError.conflict('Lo spazio non è disponibile per il nuovo orario');
            }
        }

        try {
            const query = `
                UPDATE bookings 
                SET ${fieldsToUpdate.join(', ')} 
                WHERE booking_id = $${paramCount}
                RETURNING *
            `;
            
            values.push(bookingId);

            const result = await pool.query(query, values);
            return await this.findById(result.rows[0].booking_id);
        } catch (error) {
            throw AppError.internal('Errore durante l\'aggiornamento della prenotazione', error);
        }
    }

    /**
     * Elimina una prenotazione
     * @param {number} bookingId - ID della prenotazione
     * @returns {Promise<boolean>} - true se eliminata
     */
    static async delete(bookingId) {
        try {
            const result = await pool.query(
                'DELETE FROM bookings WHERE booking_id = $1 RETURNING booking_id',
                [bookingId]
            );

            return result.rows.length > 0;
        } catch (error) {
            throw AppError.internal('Errore durante l\'eliminazione della prenotazione', error);
        }
    }

    // ============================================================================
    // BUSINESS LOGIC METHODS
    // ============================================================================

    /**
     * Verifica disponibilità di uno spazio per un determinato orario
     * @param {number} spaceId - ID dello spazio
     * @param {string} date - Data prenotazione (YYYY-MM-DD)
     * @param {string} startTime - Ora inizio (HH:MM:SS)
     * @param {string} endTime - Ora fine (HH:MM:SS)
     * @param {number} excludeBookingId - ID prenotazione da escludere (per update)
     * @returns {Promise<boolean>} - true se disponibile
     */
    static async checkSpaceAvailability(spaceId, date, startTime, endTime, excludeBookingId = null) {
        try {
            let query = `
                SELECT COUNT(*) as conflicts
                FROM bookings
                WHERE space_id = $1 
                AND booking_date = $2
                AND status NOT IN ('cancelled')
                AND (
                    (start_time < $4 AND end_time > $3) OR
                    (start_time < $3 AND end_time > $3) OR
                    (start_time >= $3 AND start_time < $4)
                )
            `;

            const values = [spaceId, date, startTime, endTime];

            if (excludeBookingId) {
                query += ` AND booking_id != $5`;
                values.push(excludeBookingId);
            }

            const result = await pool.query(query, values);
            return parseInt(result.rows[0].conflicts) === 0;
        } catch (error) {
            throw AppError.internal('Errore durante la verifica disponibilità', error);
        }
    }

    /**
     * Ottieni statistiche prenotazioni
     * @param {Object} filters - Filtri per le statistiche
     * @returns {Promise<Object>} - Statistiche
     */
    static async getStats(filters = {}) {
        try {
            let baseQuery = `
                FROM bookings b
                JOIN spaces s ON b.space_id = s.space_id
                JOIN locations l ON s.location_id = l.location_id
                WHERE 1=1
            `;

            const values = [];
            let paramCount = 1;

            // Applica filtri
            if (filters.location_id) {
                if (Array.isArray(filters.location_id)) {
                    const placeholders = filters.location_id.map(() => `$${paramCount++}`).join(',');
                    baseQuery += ` AND l.location_id IN (${placeholders})`;
                    values.push(...filters.location_id);
                } else {
                    baseQuery += ` AND l.location_id = $${paramCount++}`;
                    values.push(filters.location_id);
                }
            }

            if (filters.date_from) {
                baseQuery += ` AND b.booking_date >= $${paramCount++}`;
                values.push(filters.date_from);
            }

            if (filters.date_to) {
                baseQuery += ` AND b.booking_date <= $${paramCount++}`;
                values.push(filters.date_to);
            }

            // Query per statistiche generali
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_bookings,
                    COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
                    COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bookings,
                    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
                    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
                    COALESCE(SUM(CASE WHEN b.status != 'cancelled' THEN b.total_price ELSE 0 END), 0) as total_revenue,
                    COALESCE(SUM(CASE WHEN b.status != 'cancelled' THEN b.total_hours ELSE 0 END), 0) as total_hours,
                    COALESCE(AVG(CASE WHEN b.status != 'cancelled' THEN b.total_price ELSE NULL END), 0) as avg_booking_price
                ${baseQuery}
            `;

            const statsResult = await pool.query(statsQuery, values);
            const stats = statsResult.rows[0];

            // Query per statistiche per spazio
            const spaceStatsQuery = `
                SELECT 
                    s.space_id,
                    s.name as space_name,
                    l.name as location_name,
                    COUNT(*) as bookings_count,
                    COALESCE(SUM(b.total_price), 0) as revenue,
                    COALESCE(SUM(b.total_hours), 0) as total_hours
                ${baseQuery}
                AND b.status != 'cancelled'
                GROUP BY s.space_id, s.name, l.name
                ORDER BY revenue DESC
                LIMIT 10
            `;

            const spaceStatsResult = await pool.query(spaceStatsQuery, values);

            return {
                overview: {
                    totalBookings: parseInt(stats.total_bookings),
                    confirmedBookings: parseInt(stats.confirmed_bookings),
                    pendingBookings: parseInt(stats.pending_bookings),
                    cancelledBookings: parseInt(stats.cancelled_bookings),
                    completedBookings: parseInt(stats.completed_bookings),
                    totalRevenue: parseFloat(stats.total_revenue),
                    totalHours: parseFloat(stats.total_hours),
                    avgBookingPrice: parseFloat(stats.avg_booking_price)
                },
                topSpaces: spaceStatsResult.rows
            };
        } catch (error) {
            throw AppError.internal('Errore durante il calcolo delle statistiche', error);
        }
    }

    // ============================================================================
    // VALIDATION METHODS
    // ============================================================================

    /**
     * Validazione dati prenotazione
     * @param {Object} bookingData - Dati da validare
     * @throws {AppError} - Se validazione fallisce
     */
    static validateBookingData(bookingData) {
        const { user_id, space_id, booking_date, start_time, end_time, total_hours, total_price } = bookingData;

        if (!user_id || !space_id || !booking_date || !start_time || !end_time) {
            throw AppError.badRequest('user_id, space_id, booking_date, start_time e end_time sono obbligatori');
        }

        // Validazione formato data
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(booking_date)) {
            throw AppError.badRequest('Formato data non valido (deve essere YYYY-MM-DD)');
        }

        // Validazione formato orario
        const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
        if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
            throw AppError.badRequest('Formato orario non valido (deve essere HH:MM:SS)');
        }

        // Validazione logica orari
        if (start_time >= end_time) {
            throw AppError.badRequest('L\'ora di inizio deve essere precedente all\'ora di fine');
        }

        // Validazione numeri positivi
        if (total_hours && total_hours <= 0) {
            throw AppError.badRequest('Le ore totali devono essere positive');
        }

        if (total_price && total_price <= 0) {
            throw AppError.badRequest('Il prezzo totale deve essere positivo');
        }

        // Validazione stati
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
        if (bookingData.status && !validStatuses.includes(bookingData.status)) {
            throw AppError.badRequest(`Status non valido. Valori ammessi: ${validStatuses.join(', ')}`);
        }

        const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
        if (bookingData.payment_status && !validPaymentStatuses.includes(bookingData.payment_status)) {
            throw AppError.badRequest(`Payment status non valido. Valori ammessi: ${validPaymentStatuses.join(', ')}`);
        }
    }
}

module.exports = Booking;
