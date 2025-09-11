const pool = require('../config/db');

class Availability {
    /**
     * Crea un nuovo blocco di disponibilità giornaliera
     * @param {Object} availabilityData - Dati del blocco
     * @returns {Promise<Object>} Blocco creato
     */
    static async create(availabilityData) {
        const { space_id, availability_date, is_available = true } = availabilityData;

        const query = `
            INSERT INTO availability (space_id, availability_date, is_available)
            VALUES ($1, $2, $3)
            RETURNING *
        `;

        const result = await pool.query(query, [space_id, availability_date, is_available]);
        return result.rows[0];
    }

    /**
     * Trova un blocco di disponibilità per ID
     * @param {number} availabilityId - ID del blocco
     * @returns {Promise<Object|null>} Blocco trovato o null
     */
    static async findById(availabilityId) {
        const query = `
            SELECT a.*, s.space_name, l.location_name
            FROM availability a
            JOIN spaces s ON a.space_id = s.space_id
            JOIN locations l ON s.location_id = l.location_id
            WHERE a.availability_id = $1
        `;

        const result = await pool.query(query, [availabilityId]);
        return result.rows[0] || null;
    }

    /**
     * Trova blocchi di disponibilità per spazio e intervallo di date
     * @param {number} spaceId - ID dello spazio
     * @param {string} startDate - Data inizio
     * @param {string} endDate - Data fine
     * @returns {Promise<Array>} Array dei blocchi
     */
    static async findBySpaceAndDateRange(spaceId, startDate, endDate) {
        const query = `
            SELECT * FROM availability
            WHERE space_id = $1
            AND availability_date >= $2
            AND availability_date <= $3
            AND is_available = true
            ORDER BY availability_date, start_time
        `;

        const result = await pool.query(query, [spaceId, startDate, endDate]);
        return result.rows;
    }

    /**
     * Trova un blocco specifico per spazio, data e ora
     * @param {number} spaceId - ID dello spazio
     * @param {string} date - Data
     * @param {string} startTime - Ora inizio
     * @param {string} endTime - Ora fine
     * @returns {Promise<Object|null>} Blocco trovato o null
     */
    static async findBySpaceDateTime(spaceId, date, startTime, endTime) {
        const query = `
            SELECT * FROM availability
            WHERE space_id = $1
            AND availability_date = $2
            AND start_time = $3
            AND end_time = $4
        `;

        const result = await pool.query(query, [spaceId, date, startTime, endTime]);
        return result.rows[0] || null;
    }

    /**
     * Aggiorna un blocco di disponibilità
     * @param {number} availabilityId - ID del blocco
     * @param {Object} updateData - Dati da aggiornare
     * @returns {Promise<Object>} Blocco aggiornato
     */
    static async update(availabilityId, updateData) {
        const updateFields = [];
        const queryParams = [availabilityId];
        let paramIndex = 2;

        // Costruzione dinamica della query
        if (updateData.space_id !== undefined) {
            updateFields.push(`space_id = $${paramIndex++}`);
            queryParams.push(updateData.space_id);
        }

        if (updateData.availability_date !== undefined) {
            updateFields.push(`availability_date = $${paramIndex++}`);
            queryParams.push(updateData.availability_date);
        }

        if (updateData.start_time !== undefined) {
            updateFields.push(`start_time = $${paramIndex++}`);
            queryParams.push(updateData.start_time);
        }

        if (updateData.end_time !== undefined) {
            updateFields.push(`end_time = $${paramIndex++}`);
            queryParams.push(updateData.end_time);
        }

        if (updateData.is_available !== undefined) {
            updateFields.push(`is_available = $${paramIndex++}`);
            queryParams.push(updateData.is_available);
        }

        if (updateFields.length === 0) {
            throw new Error('Nessun campo da aggiornare fornito');
        }

        const query = `
            UPDATE availability
            SET ${updateFields.join(', ')}
            WHERE availability_id = $1
            RETURNING *
        `;

        const result = await pool.query(query, queryParams);
        return result.rows[0];
    }

    /**
     * Elimina un blocco di disponibilità
     * @param {number} availabilityId - ID del blocco
     * @returns {Promise<boolean>} True se eliminato
     */
    static async delete(availabilityId) {
        const query = 'DELETE FROM availability WHERE availability_id = $1 RETURNING *';
        const result = await pool.query(query, [availabilityId]);
        return result.rows.length > 0;
    }

    /**
     * Verifica se uno spazio esiste
     * @param {number} spaceId - ID dello spazio
     * @returns {Promise<boolean>} True se esiste
     */
    static async checkSpaceExists(spaceId) {
        const query = 'SELECT 1 FROM spaces WHERE space_id = $1';
        const result = await pool.query(query, [spaceId]);
        return result.rows.length > 0;
    }

    /**
     * Trova blocchi sovrapposti
     * @param {number} spaceId - ID dello spazio
     * @param {string} date - Data
     * @param {string} startTime - Ora inizio
     * @param {string} endTime - Ora fine
     * @param {number} excludeId - ID da escludere
     * @returns {Promise<Array>} Array dei blocchi sovrapposti
     */
    static async findOverlappingBlocks(spaceId, date, startTime, endTime, excludeId = null) {
        let query = `
            SELECT * FROM availability
            WHERE space_id = $1
            AND availability_date = $2
            AND (
                (start_time < $4 AND end_time > $3)
                OR (start_time >= $3 AND start_time < $4)
                OR (end_time > $3 AND end_time <= $4)
            )
        `;

        const queryParams = [spaceId, date, startTime, endTime];

        if (excludeId) {
            query += ` AND availability_id != $${queryParams.length + 1}`;
            queryParams.push(excludeId);
        }

        const result = await pool.query(query, queryParams);
        return result.rows;
    }

    /**
     * Trova blocchi disponibili per una prenotazione
     * @param {number} spaceId - ID dello spazio
     * @param {string} date - Data
     * @param {string} startTime - Ora inizio
     * @param {string} endTime - Ora fine
     * @returns {Promise<Array>} Array dei blocchi disponibili
     */
    static async findAvailableBlocks(spaceId, date, startTime, endTime) {
        const query = `
            SELECT * FROM availability
            WHERE space_id = $1
            AND availability_date = $2
            AND start_time <= $3
            AND end_time >= $4
            AND is_available = true
        `;

        const result = await pool.query(query, [spaceId, date, startTime, endTime]);
        return result.rows;
    }

    /**
     * Trova prenotazioni in conflitto
     * @param {number} spaceId - ID dello spazio
     * @param {string} date - Data
     * @param {string} startTime - Ora inizio
     * @param {string} endTime - Ora fine
     * @returns {Promise<Array>} Array delle prenotazioni in conflitto
     */
    static async findConflictingBookings(spaceId, date, startTime, endTime) {
        const query = `
            SELECT * FROM bookings
            WHERE space_id = $1
            AND DATE(start_datetime) = $2
            AND TIME(start_datetime) < $4
            AND TIME(end_datetime) > $3
            AND status IN ('confirmed', 'pending')
        `;

        const result = await pool.query(query, [spaceId, date, startTime, endTime]);
        return result.rows;
    }

    /**
     * Verifica se ci sono prenotazioni associate a un blocco
     * @param {number} availabilityId - ID del blocco
     * @returns {Promise<boolean>} True se ci sono prenotazioni
     */
    static async hasAssociatedBookings(availabilityId) {
        // Questo metodo verifica se ci sono prenotazioni che si sovrappongono
        // con il blocco di disponibilità che si vuole eliminare
        const availabilityQuery = `
            SELECT space_id, availability_date, start_time, end_time
            FROM availability
            WHERE availability_id = $1
        `;

        const availabilityResult = await pool.query(availabilityQuery, [availabilityId]);
        if (availabilityResult.rows.length === 0) return false;

        const { space_id, availability_date, start_time, end_time } = availabilityResult.rows[0];

        const bookingsQuery = `
            SELECT COUNT(*) as count FROM bookings
            WHERE space_id = $1
            AND DATE(start_datetime) = $2
            AND TIME(start_datetime) < $4
            AND TIME(end_datetime) > $3
            AND status IN ('confirmed', 'pending')
        `;

        const bookingsResult = await pool.query(bookingsQuery, [space_id, availability_date, start_time, end_time]);
        return parseInt(bookingsResult.rows[0].count) > 0;
    }

    /**
     * Ottiene statistiche sulla disponibilità
     * @param {number} spaceId - ID dello spazio
     * @param {string} startDate - Data inizio
     * @param {string} endDate - Data fine
     * @returns {Promise<Object>} Statistiche
     */
    static async getStatistics(spaceId, startDate, endDate) {
        const queries = [
            // Blocchi totali nel periodo
            `SELECT COUNT(*) as total_blocks
             FROM availability
             WHERE space_id = $1 AND availability_date >= $2 AND availability_date <= $3`,

            // Blocchi disponibili
            `SELECT COUNT(*) as available_blocks
             FROM availability
             WHERE space_id = $1 AND availability_date >= $2 AND availability_date <= $3 AND is_available = true`,

            // Ore totali disponibili
            `SELECT SUM(
                EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
             ) as total_hours
             FROM availability
             WHERE space_id = $1 AND availability_date >= $2 AND availability_date <= $3 AND is_available = true`,

            // Prenotazioni nel periodo
            `SELECT COUNT(*) as total_bookings
             FROM bookings
             WHERE space_id = $1 AND DATE(start_datetime) >= $2 AND DATE(end_datetime) <= $3`,

            // Tasso di occupazione
            `SELECT 
                COUNT(DISTINCT DATE(b.start_datetime)) as booked_days,
                COUNT(DISTINCT a.availability_date) as available_days
             FROM availability a
             LEFT JOIN bookings b ON a.space_id = b.space_id 
                AND a.availability_date = DATE(b.start_datetime)
                AND b.status IN ('confirmed', 'completed')
             WHERE a.space_id = $1 
                AND a.availability_date >= $2 
                AND a.availability_date <= $3 
                AND a.is_available = true`
        ];

        const results = await Promise.all(
            queries.map(query => pool.query(query, [spaceId, startDate, endDate]))
        );

        const totalBlocks = parseInt(results[0].rows[0].total_blocks);
        const availableBlocks = parseInt(results[1].rows[0].available_blocks);
        const totalHours = parseFloat(results[2].rows[0].total_hours) || 0;
        const totalBookings = parseInt(results[3].rows[0].total_bookings);
        const { booked_days, available_days } = results[4].rows[0];

        const occupationRate = available_days > 0 ? 
            (parseInt(booked_days) / parseInt(available_days)) * 100 : 0;

        return {
            totalBlocks,
            availableBlocks,
            unavailableBlocks: totalBlocks - availableBlocks,
            totalHours: parseFloat(totalHours.toFixed(2)),
            totalBookings,
            occupationRate: parseFloat(occupationRate.toFixed(2)),
            availableDays: parseInt(available_days),
            bookedDays: parseInt(booked_days)
        };
    }

    /**
     * Disabilita disponibilità per un periodo
     * @param {number} spaceId - ID dello spazio
     * @param {string} startDate - Data inizio
     * @param {string} endDate - Data fine
     * @param {string} reason - Motivo
     * @returns {Promise<Array>} Blocchi aggiornati
     */
    static async disablePeriod(spaceId, startDate, endDate, reason) {
        const query = `
            UPDATE availability
            SET is_available = false
            WHERE space_id = $1
            AND availability_date >= $2
            AND availability_date <= $3
            RETURNING *
        `;

        const result = await pool.query(query, [spaceId, startDate, endDate]);
        return result.rows;
    }

    /**
     * Riattiva disponibilità per un periodo
     * @param {number} spaceId - ID dello spazio
     * @param {string} startDate - Data inizio
     * @param {string} endDate - Data fine
     * @returns {Promise<Array>} Blocchi aggiornati
     */
    static async enablePeriod(spaceId, startDate, endDate) {
        const query = `
            UPDATE availability
            SET is_available = true
            WHERE space_id = $1
            AND availability_date >= $2
            AND availability_date <= $3
            RETURNING *
        `;

        const result = await pool.query(query, [spaceId, startDate, endDate]);
        return result.rows;
    }

    /**
     * Trova tutti i blocchi di disponibilità per uno spazio
     * @param {number} spaceId - ID dello spazio
     * @param {Object} filters - Filtri opzionali
     * @returns {Promise<Array>} Array dei blocchi
     */
    static async findBySpace(spaceId, filters = {}) {
        let query = `
            SELECT a.*, s.space_name, l.location_name
            FROM availability a
            JOIN spaces s ON a.space_id = s.space_id
            JOIN locations l ON s.location_id = l.location_id
            WHERE a.space_id = $1
        `;

        const queryParams = [spaceId];
        let paramIndex = 2;

        // Filtro per is_available
        if (filters.is_available !== undefined) {
            query += ` AND a.is_available = $${paramIndex++}`;
            queryParams.push(filters.is_available);
        }

        // Filtro per data minima
        if (filters.date_from) {
            query += ` AND a.availability_date >= $${paramIndex++}`;
            queryParams.push(filters.date_from);
        }

        // Filtro per data massima
        if (filters.date_to) {
            query += ` AND a.availability_date <= $${paramIndex++}`;
            queryParams.push(filters.date_to);
        }

        query += ' ORDER BY a.availability_date, a.start_time';

        const result = await pool.query(query, queryParams);
        return result.rows;
    }

    /**
     * Elimina tutti i blocchi di disponibilità per uno spazio
     * @param {number} spaceId - ID dello spazio
     * @returns {Promise<number>} Numero di blocchi eliminati
     */
    static async deleteBySpace(spaceId) {
        const query = 'DELETE FROM availability WHERE space_id = $1 RETURNING *';
        const result = await pool.query(query, [spaceId]);
        return result.rows.length;
    }

    /**
     * Cerca blocchi liberi in un intervallo di tempo
     * @param {Array} spaceIds - Array di ID spazi
     * @param {string} date - Data
     * @param {string} startTime - Ora inizio
     * @param {string} endTime - Ora fine
     * @returns {Promise<Array>} Spazi disponibili
     */
    static async findFreeSpaces(spaceIds, date, startTime, endTime) {
        const query = `
            SELECT DISTINCT s.space_id, s.space_name, l.location_name
            FROM spaces s
            JOIN locations l ON s.location_id = l.location_id
            WHERE s.space_id = ANY($1)
            AND EXISTS (
                SELECT 1 FROM availability a
                WHERE a.space_id = s.space_id
                AND a.availability_date = $2
                AND a.start_time <= $3
                AND a.end_time >= $4
                AND a.is_available = true
            )
            AND NOT EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.space_id = s.space_id
                AND DATE(b.start_datetime) = $2
                AND TIME(b.start_datetime) < $4
                AND TIME(b.end_datetime) > $3
                AND b.status IN ('confirmed', 'pending')
            )
            ORDER BY l.location_name, s.space_name
        `;

        const result = await pool.query(query, [spaceIds, date, startTime, endTime]);
        return result.rows;
    }

    /**
     * Verifica se ci sono prenotazioni in un periodo specifico
     * @param {number} spaceId - ID dello spazio
     * @param {string} startDate - Data inizio
     * @param {string} endDate - Data fine
     * @returns {Promise<boolean>} True se ci sono prenotazioni
     */
    static async hasBookingsInPeriod(spaceId, startDate, endDate) {
        const query = `
            SELECT COUNT(*) as booking_count
            FROM bookings
            WHERE space_id = $1
            AND DATE(start_datetime) >= $2
            AND DATE(end_datetime) <= $3
            AND status IN ('confirmed', 'pending')
        `;

        const result = await pool.query(query, [spaceId, startDate, endDate]);
        return parseInt(result.rows[0].booking_count) > 0;
    }
}

module.exports = Availability;
