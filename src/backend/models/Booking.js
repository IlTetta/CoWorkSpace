// src/backend/models/Booking.js
const pool = require('../config/db');
const AppError = require('../utils/AppError');

/**
 * Model per gestire le prenotazioni degli spazi di co-working
 * Supporta prenotazioni multi-giorno con datetime completi
 */
class Booking {
    constructor(data) {
        this.booking_id = data.booking_id;
        this.user_id = data.user_id;
        this.space_id = data.space_id;
        this.start_datetime = data.start_datetime;
        this.end_datetime = data.end_datetime;
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
        
        // Campi calcolati per comodità
        this.booking_date = data.start_datetime ? new Date(data.start_datetime).toISOString().split('T')[0] : null;
        this.duration_days = this.calculateDurationDays();
    }

    /**
     * Calcola la durata in giorni della prenotazione
     * @returns {number} - Numero di giorni (inclusi parziali)
     */
    calculateDurationDays() {
        if (!this.start_datetime || !this.end_datetime) return 0;
        
        const start = new Date(this.start_datetime);
        const end = new Date(this.end_datetime);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
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
            user_id, space_id, start_datetime, end_datetime,
            total_price, status = 'pending', payment_status = 'pending', notes
        } = bookingData;

        // Validazione dati obbligatori
        this.validateBookingData(bookingData);

        // Verifica disponibilità prima di creare (con orari di apertura)
        const Space = require('./Space');
        const availabilityCheck = await Space.checkAvailabilityWithSchedule(
            space_id, start_datetime, end_datetime
        );
        
        if (!availabilityCheck.available) {
            throw AppError.conflict(availabilityCheck.message, {
                reason: availabilityCheck.reason,
                details: availabilityCheck
            });
        }

        try {
            const query = `
                INSERT INTO bookings (
                    user_id, space_id, start_datetime, end_datetime,
                    total_price, status, payment_status, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;
            
            const values = [
                user_id, space_id, start_datetime, end_datetime,
                total_price, status, payment_status, notes
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
            if (error.code === '23514') { // Check constraint violation
                if (error.constraint?.includes('booking_datetime_order')) {
                    throw AppError.badRequest('La data/ora di inizio deve essere precedente a quella di fine');
                }
                if (error.constraint?.includes('booking_future_date')) {
                    throw AppError.badRequest('La prenotazione deve essere per una data futura');
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

            // Filtri per datetime
            if (filters.start_date) {
                query += ` AND DATE(b.start_datetime) >= $${paramCount++}`;
                values.push(filters.start_date);
            }

            if (filters.end_date) {
                query += ` AND DATE(b.end_datetime) <= $${paramCount++}`;
                values.push(filters.end_date);
            }

            if (filters.date_from) {
                query += ` AND b.start_datetime >= $${paramCount++}`;
                values.push(filters.date_from);
            }

            if (filters.date_to) {
                query += ` AND b.end_datetime <= $${paramCount++}`;
                values.push(filters.date_to);
            }

            // Filtro per prenotazioni che toccano una data specifica
            if (filters.intersects_date) {
                query += ` AND DATE(b.start_datetime) <= $${paramCount} AND DATE(b.end_datetime) >= $${paramCount++}`;
                values.push(filters.intersects_date);
            }

            // Filtro per prenotazioni attive in un periodo
            if (filters.active_between_start && filters.active_between_end) {
                query += ` AND b.start_datetime < $${paramCount++} AND b.end_datetime > $${paramCount++}`;
                values.push(filters.active_between_end, filters.active_between_start);
            }

            // Ordinamento
            query += ` ORDER BY b.start_datetime DESC, b.created_at DESC`;

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
            'start_datetime', 'end_datetime', 'total_price', 
            'status', 'payment_status', 'notes'
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

        // Verifica disponibilità se si modificano datetime (con orari di apertura)
        if (updateData.start_datetime || updateData.end_datetime) {
            const newStartDatetime = updateData.start_datetime || existing.start_datetime;
            const newEndDatetime = updateData.end_datetime || existing.end_datetime;

            const Space = require('./Space');
            const availabilityCheck = await Space.checkAvailabilityWithSchedule(
                existing.space_id, newStartDatetime, newEndDatetime
            );
            
            if (!availabilityCheck.available) {
                throw AppError.conflict(availabilityCheck.message, {
                    reason: availabilityCheck.reason,
                    details: availabilityCheck
                });
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
            if (error.code === '23514') { // Check constraint violation
                if (error.constraint?.includes('booking_datetime_order')) {
                    throw AppError.badRequest('La data/ora di inizio deve essere precedente a quella di fine');
                }
                if (error.constraint?.includes('booking_future_date')) {
                    throw AppError.badRequest('La prenotazione deve essere per una data futura');
                }
            }
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
     * Verifica disponibilità di uno spazio per un determinato periodo
     * @param {number} spaceId - ID dello spazio
     * @param {string} startDatetime - Data/ora inizio (ISO string)
     * @param {string} endDatetime - Data/ora fine (ISO string)
     * @param {number} excludeBookingId - ID prenotazione da escludere (per update)
     * @returns {Promise<boolean>} - true se disponibile
     */
    static async checkSpaceAvailability(spaceId, startDatetime, endDatetime, excludeBookingId = null) {
        try {
            let query = `
                SELECT COUNT(*) as conflicts
                FROM bookings
                WHERE space_id = $1 
                AND status NOT IN ('cancelled')
                AND (
                    (start_datetime < $3 AND end_datetime > $2) OR
                    (start_datetime >= $2 AND start_datetime < $3) OR
                    (end_datetime > $2 AND end_datetime <= $3)
                )
            `;

            const values = [spaceId, startDatetime, endDatetime];

            if (excludeBookingId) {
                query += ` AND booking_id != $4`;
                values.push(excludeBookingId);
            }

            const result = await pool.query(query, values);
            return parseInt(result.rows[0].conflicts) === 0;
        } catch (error) {
            throw AppError.internal('Errore durante la verifica disponibilità', error);
        }
    }

    /**
     * Verifica disponibilità di uno spazio per una data specifica
     * @param {number} spaceId - ID dello spazio
     * @param {string} date - Data nel formato YYYY-MM-DD
     * @returns {Promise<Array>} - Array di orari occupati
     */
    static async getSpaceAvailabilityForDate(spaceId, date) {
        try {
            const query = `
                SELECT 
                    start_datetime,
                    end_datetime,
                    status
                FROM bookings
                WHERE space_id = $1 
                AND DATE(start_datetime) <= $2
                AND DATE(end_datetime) >= $2
                AND status NOT IN ('cancelled')
                ORDER BY start_datetime
            `;

            const result = await pool.query(query, [spaceId, date]);
            return result.rows.map(row => ({
                start_datetime: row.start_datetime,
                end_datetime: row.end_datetime,
                status: row.status
            }));
        } catch (error) {
            throw AppError.internal('Errore durante la verifica disponibilità giornaliera', error);
        }
    }

    /**
     * Trova prenotazioni che si sovrappongono con un periodo specificato
     * @param {number} spaceId - ID dello spazio
     * @param {string} startDatetime - Data/ora inizio
     * @param {string} endDatetime - Data/ora fine
     * @returns {Promise<Array<Booking>>} - Prenotazioni che si sovrappongono
     */
    static async findOverlappingBookings(spaceId, startDatetime, endDatetime) {
        try {
            const query = `
                SELECT b.*, 
                    u.name as user_name, 
                    u.surname as user_surname,
                    s.space_name
                FROM bookings b
                JOIN users u ON b.user_id = u.user_id
                JOIN spaces s ON b.space_id = s.space_id
                WHERE b.space_id = $1 
                AND b.status NOT IN ('cancelled')
                AND (
                    (b.start_datetime < $3 AND b.end_datetime > $2) OR
                    (b.start_datetime >= $2 AND b.start_datetime < $3) OR
                    (b.end_datetime > $2 AND b.end_datetime <= $3)
                )
                ORDER BY b.start_datetime
            `;

            const result = await pool.query(query, [spaceId, startDatetime, endDatetime]);
            return result.rows.map(row => new Booking(row));
        } catch (error) {
            throw AppError.internal('Errore durante la ricerca delle sovrapposizioni', error);
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
                baseQuery += ` AND b.start_datetime >= $${paramCount++}`;
                values.push(filters.date_from);
            }

            if (filters.date_to) {
                baseQuery += ` AND b.end_datetime <= $${paramCount++}`;
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
                    COALESCE(AVG(CASE WHEN b.status != 'cancelled' THEN b.total_price ELSE NULL END), 0) as avg_booking_price,
                    COUNT(CASE WHEN EXTRACT(EPOCH FROM (b.end_datetime - b.start_datetime)) > 86400 THEN 1 END) as multi_day_bookings,
                    COALESCE(AVG(CASE WHEN b.status != 'cancelled' THEN EXTRACT(EPOCH FROM (b.end_datetime - b.start_datetime)) / 3600 ELSE NULL END), 0) as avg_duration_hours
                ${baseQuery}
            `;

            const statsResult = await pool.query(statsQuery, values);
            const stats = statsResult.rows[0];

            // Query per statistiche per spazio
            const spaceStatsQuery = `
                SELECT 
                    s.space_id,
                    s.space_name,
                    l.location_name,
                    COUNT(*) as bookings_count,
                    COALESCE(SUM(b.total_price), 0) as revenue,
                    COALESCE(SUM(b.total_hours), 0) as total_hours,
                    COALESCE(AVG(b.total_hours), 0) as avg_booking_duration
                ${baseQuery}
                AND b.status != 'cancelled'
                GROUP BY s.space_id, s.space_name, l.location_name
                ORDER BY revenue DESC
                LIMIT 10
            `;

            const spaceStatsResult = await pool.query(spaceStatsQuery, values);

            // Query per trend mensili
            const trendQuery = `
                SELECT 
                    DATE_TRUNC('month', b.start_datetime) as month,
                    COUNT(*) as bookings_count,
                    COALESCE(SUM(b.total_price), 0) as revenue,
                    COALESCE(SUM(b.total_hours), 0) as total_hours
                ${baseQuery}
                AND b.status != 'cancelled'
                AND b.start_datetime >= CURRENT_DATE - INTERVAL '12 months'
                GROUP BY DATE_TRUNC('month', b.start_datetime)
                ORDER BY month DESC
                LIMIT 12
            `;

            const trendResult = await pool.query(trendQuery, values);

            return {
                overview: {
                    totalBookings: parseInt(stats.total_bookings),
                    confirmedBookings: parseInt(stats.confirmed_bookings),
                    pendingBookings: parseInt(stats.pending_bookings),
                    cancelledBookings: parseInt(stats.cancelled_bookings),
                    completedBookings: parseInt(stats.completed_bookings),
                    totalRevenue: parseFloat(stats.total_revenue),
                    totalHours: parseFloat(stats.total_hours),
                    avgBookingPrice: parseFloat(stats.avg_booking_price),
                    multiDayBookings: parseInt(stats.multi_day_bookings),
                    avgDurationHours: parseFloat(stats.avg_duration_hours)
                },
                topSpaces: spaceStatsResult.rows,
                monthlyTrend: trendResult.rows
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
        const { user_id, space_id, start_datetime, end_datetime, total_price } = bookingData;

        if (!user_id || !space_id || !start_datetime || !end_datetime) {
            throw AppError.badRequest('user_id, space_id, start_datetime e end_datetime sono obbligatori');
        }

        // Validazione formato datetime (deve essere ISO string o Date valida)
        const startDate = new Date(start_datetime);
        const endDate = new Date(end_datetime);

        if (isNaN(startDate.getTime())) {
            throw AppError.badRequest('Formato start_datetime non valido (deve essere ISO string)');
        }

        if (isNaN(endDate.getTime())) {
            throw AppError.badRequest('Formato end_datetime non valido (deve essere ISO string)');
        }

        // Validazione logica datetime
        if (startDate >= endDate) {
            throw AppError.badRequest('La data/ora di inizio deve essere precedente a quella di fine');
        }

        // Validazione che la prenotazione sia nel futuro (con tolleranza di 1 giorno)
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        if (startDate < yesterday) {
            throw AppError.badRequest('Non è possibile creare prenotazioni per date passate');
        }

        // Validazione durata massima (es. max 30 giorni)
        const diffTime = endDate.getTime() - startDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        
        if (diffDays > 30) {
            throw AppError.badRequest('La durata massima di una prenotazione è di 30 giorni');
        }

        // Validazione durata minima (es. min 1 ora)
        const diffHours = diffTime / (1000 * 60 * 60);
        
        if (diffHours < 1) {
            throw AppError.badRequest('La durata minima di una prenotazione è di 1 ora');
        }

        // Validazione numero positivo per prezzo
        if (total_price && total_price <= 0) {
            throw AppError.badRequest('Il prezzo totale deve essere positivo');
        }

        // Validazione stati
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
        if (bookingData.status && !validStatuses.includes(bookingData.status)) {
            throw AppError.badRequest(`Status non valido. Valori ammessi: ${validStatuses.join(', ')}`);
        }

        const validPaymentStatuses = ['pending', 'completed', 'failed', 'refunded'];
        if (bookingData.payment_status && !validPaymentStatuses.includes(bookingData.payment_status)) {
            throw AppError.badRequest(`Payment status non valido. Valori ammessi: ${validPaymentStatuses.join(', ')}`);
        }
    }

    /**
     * Formatta datetime per il database PostgreSQL
     * @param {string|Date} datetime - Datetime da formattare
     * @returns {string} - Datetime formattato per PostgreSQL
     */
    static formatDateTimeForDB(datetime) {
        const date = new Date(datetime);
        return date.toISOString();
    }

    /**
     * Converte i dati di input per compatibilità con il nuovo formato
     * @param {Object} inputData - Dati in input (può avere formato vecchio o nuovo)
     * @returns {Object} - Dati convertiti al nuovo formato
     */
    static convertLegacyBookingData(inputData) {
        // Se ha già i nuovi campi, restituisci così com'è
        if (inputData.start_datetime && inputData.end_datetime) {
            return inputData;
        }

        // Se ha i campi vecchi, converti
        if (inputData.booking_date && inputData.start_time && inputData.end_time) {
            const bookingDate = inputData.booking_date;
            const startTime = inputData.start_time;
            const endTime = inputData.end_time;

            return {
                ...inputData,
                start_datetime: `${bookingDate}T${startTime}`,
                end_datetime: `${bookingDate}T${endTime}`,
                // Rimuovi i campi vecchi
                booking_date: undefined,
                start_time: undefined,
                end_time: undefined
            };
        }

        return inputData;
    }
}

module.exports = Booking;
