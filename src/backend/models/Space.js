// src/backend/models/Space.js
const db = require('../config/db');
const AppError = require('../utils/AppError');

/**
 * Classe Space per gestire gli spazi di lavoro con orari di disponibilità
 */
class Space {
    constructor(data) {
        this.space_id = data.space_id;
        this.location_id = data.location_id;
        this.space_type_id = data.space_type_id;
        this.space_name = data.space_name;
        this.description = data.description;
        this.capacity = data.capacity;
        this.price_per_hour = data.price_per_hour;
        this.price_per_day = data.price_per_day;
        
        // Nuovi campi per orari di disponibilità
        this.opening_time = data.opening_time;
        this.closing_time = data.closing_time;
        this.available_days = data.available_days; // Array di giorni [1,2,3,4,5]
        this.min_booking_hours = data.min_booking_hours;
        this.max_booking_hours = data.max_booking_hours;
        this.booking_advance_days = data.booking_advance_days;
        this.status = data.status;
        
        // Campi calcolati
        this.daily_hours = data.daily_hours;
        this.days_per_week = data.days_per_week;
        
        // Campi aggiuntivi da JOIN queries
        if (data.location_name) {
            this.location = {
                id: data.location_id,
                name: data.location_name,
                city: data.city,
                address: data.address
            };
        }
        
        if (data.type_name || data.space_type_name) {
            this.space_type = {
                id: data.space_type_id,
                name: data.type_name || data.space_type_name,
                description: data.type_description || data.space_type_description
            };
        }
    }

    /**
     * Crea un nuovo spazio
     * @param {Object} spaceData - Dati dello spazio
     * @returns {Promise<Space>} - Spazio creato
     */
    static async create(spaceData) {
        const {
            location_id,
            space_type_id,
            space_name,
            description,
            capacity,
            price_per_hour,
            price_per_day,
            opening_time,
            closing_time,
            available_days
        } = spaceData;

        // Validazione input
        this.validateSpaceData(spaceData);

        const query = `
            INSERT INTO spaces (
                location_id, space_type_id, space_name, description, 
                capacity, price_per_hour, price_per_day,
                opening_time, closing_time, available_days
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        try {
            const result = await db.query(query, [
                location_id,
                space_type_id,
                space_name,
                description,
                capacity,
                price_per_hour,
                price_per_day,
                opening_time || '09:00:00',
                closing_time || '18:00:00',
                available_days || [1, 2, 3, 4, 5]
            ]);

            return new Space(result.rows[0]);
        } catch (error) {
            if (error.code === '23503') { // Foreign key violation
                if (error.constraint?.includes('location')) {
                    throw AppError.badRequest('Location non valida');
                }
                if (error.constraint?.includes('space_type')) {
                    throw AppError.badRequest('Tipo spazio non valido');
                }
            }
            throw error;
        }
    }

    /**
     * Trova spazio per ID con dettagli completi
     * @param {number} id - ID dello spazio
     * @returns {Promise<Space|null>} - Spazio trovato o null
     */
    static async findById(id) {
        const query = `
            SELECT 
                s.*,
                l.location_name, l.city, l.address,
                st.type_name, st.description as type_description
            FROM spaces s
            JOIN locations l ON s.location_id = l.location_id
            JOIN space_types st ON s.space_type_id = st.space_type_id
            WHERE s.space_id = $1
        `;

        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }

        return new Space(result.rows[0]);
    }

    /**
     * Trova tutti gli spazi con filtri
     * @param {Object} filters - Filtri di ricerca
     * @returns {Promise<Space[]>} - Array di spazi
     */
    static async findAll(filters = {}) {
        let query = `
            SELECT 
                s.*,
                l.location_name, l.city, l.address,
                st.type_name, st.description as type_description
            FROM spaces s
            JOIN locations l ON s.location_id = l.location_id
            JOIN space_types st ON s.space_type_id = st.space_type_id
        `;
        
        const conditions = [];
        const values = [];

        // Filtro per location
        if (filters.location_id) {
            conditions.push(`s.location_id = $${values.length + 1}`);
            values.push(filters.location_id);
        }

        // Filtro per tipo spazio
        if (filters.space_type_id) {
            conditions.push(`s.space_type_id = $${values.length + 1}`);
            values.push(filters.space_type_id);
        }

        // Filtro per città
        if (filters.city) {
            conditions.push(`LOWER(l.city) = LOWER($${values.length + 1})`);
            values.push(filters.city);
        }

        // Filtro per capacità minima
        if (filters.min_capacity) {
            conditions.push(`s.capacity >= $${values.length + 1}`);
            values.push(filters.min_capacity);
        }

        // Filtro per prezzo massimo orario
        if (filters.max_price_hour) {
            conditions.push(`s.price_per_hour <= $${values.length + 1}`);
            values.push(filters.max_price_hour);
        }

        // Filtro per nome (ricerca parziale)
        if (filters.name) {
            conditions.push(`LOWER(s.space_name) LIKE LOWER($${values.length + 1})`);
            values.push(`%${filters.name}%`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY l.location_name, s.space_name';

        const result = await db.query(query, values);
        return result.rows.map(row => new Space(row));
    }

    /**
     * Trova spazi per location
     * @param {number} locationId - ID della location
     * @returns {Promise<Space[]>} - Array di spazi
     */
    static async findByLocation(locationId) {
        return this.findAll({ location_id: locationId });
    }

    /**
     * Trova spazi disponibili per un periodo
     * @param {Object} criteria - Criteri di ricerca
     * @returns {Promise<Space[]>} - Array di spazi disponibili
     */
    static async findAvailable(criteria) {
        const { 
            startDate, 
            endDate, 
            city, 
            capacity, 
            space_type_id, 
            max_price_hour,
            location_id 
        } = criteria;

        let query = `
            SELECT DISTINCT
                s.*,
                l.location_name, l.city, l.address,
                st.type_name, st.description as type_description
            FROM spaces s
            JOIN locations l ON s.location_id = l.location_id
            JOIN space_types st ON s.space_type_id = st.space_type_id
        `;

        const conditions = [];
        const values = [];

        // Filtri base
        if (location_id) {
            conditions.push(`s.location_id = $${values.length + 1}`);
            values.push(location_id);
        }

        if (city) {
            conditions.push(`LOWER(l.city) = LOWER($${values.length + 1})`);
            values.push(city);
        }

        if (capacity) {
            conditions.push(`s.capacity >= $${values.length + 1}`);
            values.push(capacity);
        }

        if (space_type_id) {
            conditions.push(`s.space_type_id = $${values.length + 1}`);
            values.push(space_type_id);
        }

        if (max_price_hour) {
            conditions.push(`s.price_per_hour <= $${values.length + 1}`);
            values.push(max_price_hour);
        }

        // Filtro disponibilità temporale
        if (startDate && endDate) {
            conditions.push(`
                NOT EXISTS (
                    SELECT 1 FROM bookings b 
                    WHERE b.space_id = s.space_id 
                    AND b.status IN ('confirmed', 'pending')
                    AND (
                        (b.start_time <= $${values.length + 1} AND b.end_time > $${values.length + 1}) OR
                        (b.start_time < $${values.length + 2} AND b.end_time >= $${values.length + 2}) OR
                        (b.start_time >= $${values.length + 1} AND b.end_time <= $${values.length + 2})
                    )
                )
            `);
            values.push(startDate, endDate);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY l.city, l.location_name, s.space_name';

        const result = await db.query(query, values);
        return result.rows.map(row => new Space(row));
    }

    /**
     * Aggiorna uno spazio
     * @param {number} id - ID dello spazio
     * @param {Object} updateData - Dati da aggiornare
     * @returns {Promise<Space>} - Spazio aggiornato
     */
    static async update(id, updateData) {
        // Validazione input
        this.validateSpaceData(updateData, true);

        const fields = [];
        const values = [];
        let paramCount = 1;

        // Costruisci query dinamicamente
        const allowedFields = [
            'space_name', 'description', 'capacity', 
            'price_per_hour', 'price_per_day', 'space_type_id',
            'opening_time', 'closing_time', 'available_days'
        ];

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key)) {
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
            UPDATE spaces 
            SET ${fields.join(', ')} 
            WHERE space_id = $${paramCount}
            RETURNING *
        `;

        try {
            const result = await db.query(query, values);
            
            if (result.rows.length === 0) {
                throw AppError.notFound('Spazio non trovato');
            }

            return new Space(result.rows[0]);
        } catch (error) {
            if (error.code === '23503') {
                throw AppError.badRequest('Tipo spazio non valido');
            }
            throw error;
        }
    }

    /**
     * Elimina uno spazio
     * @param {number} id - ID dello spazio
     * @returns {Promise<boolean>} - true se eliminato
     */
    static async delete(id) {
        // Verifica se ci sono prenotazioni attive
        const bookingsQuery = `
            SELECT COUNT(*) as count 
            FROM bookings 
            WHERE space_id = $1 AND status IN ('confirmed', 'pending')
        `;
        const bookingsResult = await db.query(bookingsQuery, [id]);
        
        if (parseInt(bookingsResult.rows[0].count) > 0) {
            throw AppError.badRequest('Impossibile eliminare: ci sono prenotazioni attive per questo spazio');
        }

        const query = 'DELETE FROM spaces WHERE space_id = $1 RETURNING space_id';
        const result = await db.query(query, [id]);

        if (result.rows.length === 0) {
            throw AppError.notFound('Spazio non trovato');
        }

        return true;
    }

    /**
     * Verifica disponibilità di uno spazio per un periodo
     * @param {number} spaceId - ID dello spazio
     * @param {string} startDateTime - Inizio periodo (ISO string)
     * @param {string} endDateTime - Fine periodo (ISO string)
     * @returns {Promise<boolean>} - true se disponibile
     */
    static async checkAvailability(spaceId, startDateTime, endDateTime) {
        // Converti le date ISO in oggetti Date
        const startDate = new Date(startDateTime);
        const endDate = new Date(endDateTime);
        
        // Estrai data e ora separatamente
        const bookingDate = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const startTime = startDate.toTimeString().split(' ')[0]; // HH:MM:SS
        const endTime = endDate.toTimeString().split(' ')[0]; // HH:MM:SS
        
        // Verifica che le date di inizio e fine siano lo stesso giorno
        const endDateStr = endDate.toISOString().split('T')[0];
        if (bookingDate !== endDateStr) {
            throw new Error('Le prenotazioni devono essere nello stesso giorno');
        }
        
        const query = `
            SELECT COUNT(*) as count
            FROM bookings
            WHERE space_id = $1
            AND DATE(start_datetime) = $2
            AND status IN ('confirmed', 'pending')
            AND (
                (TIME(start_datetime) <= $3::time AND TIME(end_datetime) > $3::time) OR
                (TIME(start_datetime) < $4::time AND TIME(end_datetime) >= $4::time) OR
                (TIME(start_datetime) >= $3::time AND TIME(end_datetime) <= $4::time)
            )
        `;

        const result = await db.query(query, [spaceId, bookingDate, startTime, endTime]);
        return parseInt(result.rows[0].count) === 0;
    }

    /**
     * Ottieni statistiche di uno spazio
     * @param {number} id - ID dello spazio
     * @returns {Promise<Object>} - Statistiche dello spazio
     */
    static async getStats(id) {
        const queries = {
            totalBookings: 'SELECT COUNT(*) as count FROM bookings WHERE space_id = $1',
            activeBookings: `
                SELECT COUNT(*) as count 
                FROM bookings 
                WHERE space_id = $1 AND status = 'confirmed'
            `,
            completedBookings: `
                SELECT COUNT(*) as count 
                FROM bookings 
                WHERE space_id = $1 AND status = 'completed'
            `,
            revenue: `
                SELECT COALESCE(SUM(p.amount), 0) as revenue 
                FROM payments p 
                JOIN bookings b ON p.booking_id = b.booking_id 
                WHERE b.space_id = $1 AND p.status = 'completed'
            `,
            averageBookingDuration: `
                SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (end_time - start_time))/3600), 0) as avg_hours
                FROM bookings 
                WHERE space_id = $1 AND status = 'completed'
            `
        };

        const results = {};
        for (const [key, query] of Object.entries(queries)) {
            try {
                const result = await db.query(query, [id]);
                results[key] = result.rows[0].count || 
                              result.rows[0].revenue || 
                              result.rows[0].avg_hours || 0;
            } catch (error) {
                // Graceful degradation per tabelle non esistenti
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
     * Validazione dati spazio
     * @param {Object} data - Dati da validare
     * @param {boolean} isUpdate - Se è un aggiornamento
     */
    static validateSpaceData(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate || data.space_name !== undefined) {
            if (!data.space_name || data.space_name.trim().length < 2) {
                errors.push('Nome spazio deve essere di almeno 2 caratteri');
            }
            if (data.space_name && data.space_name.length > 255) {
                errors.push('Nome spazio troppo lungo (max 255 caratteri)');
            }
        }

        if (!isUpdate || data.capacity !== undefined) {
            if (!data.capacity || !Number.isInteger(data.capacity) || data.capacity <= 0) {
                errors.push('Capacità deve essere un numero intero positivo');
            }
            if (data.capacity && data.capacity > 1000) {
                errors.push('Capacità troppo alta (max 1000 persone)');
            }
        }

        if (!isUpdate || data.price_per_hour !== undefined) {
            if (data.price_per_hour === null || data.price_per_hour === undefined || data.price_per_hour < 0) {
                errors.push('Prezzo orario deve essere >= 0');
            }
            if (data.price_per_hour && data.price_per_hour > 10000) {
                errors.push('Prezzo orario troppo alto (max 10000 €/h)');
            }
        }

        if (!isUpdate || data.price_per_day !== undefined) {
            if (data.price_per_day === null || data.price_per_day === undefined || data.price_per_day < 0) {
                errors.push('Prezzo giornaliero deve essere >= 0');
            }
            if (data.price_per_day && data.price_per_day > 100000) {
                errors.push('Prezzo giornaliero troppo alto (max 100000 €/giorno)');
            }
        }

        if (!isUpdate) {
            if (!data.location_id || !Number.isInteger(data.location_id) || data.location_id <= 0) {
                errors.push('ID location non valido');
            }
            if (!data.space_type_id || !Number.isInteger(data.space_type_id) || data.space_type_id <= 0) {
                errors.push('ID tipo spazio non valido');
            }
        }

        if (data.description && data.description.length > 1000) {
            errors.push('Descrizione troppo lunga (max 1000 caratteri)');
        }

        // Validazioni per orari
        if (!isUpdate || data.opening_time !== undefined) {
            if (data.opening_time && !this.isValidTimeFormat(data.opening_time)) {
                errors.push('Formato orario di apertura non valido (formato: HH:MM)');
            }
        }

        if (!isUpdate || data.closing_time !== undefined) {
            if (data.closing_time && !this.isValidTimeFormat(data.closing_time)) {
                errors.push('Formato orario di chiusura non valido (formato: HH:MM)');
            }
        }

        // Validazione che l'orario di apertura sia precedente alla chiusura
        if (data.opening_time && data.closing_time) {
            if (data.opening_time >= data.closing_time) {
                errors.push('L\'orario di apertura deve essere precedente a quello di chiusura');
            }
        }

        // Validazioni per giorni disponibili
        if (!isUpdate || data.available_days !== undefined) {
            if (data.available_days) {
                if (!Array.isArray(data.available_days)) {
                    errors.push('I giorni disponibili devono essere un array');
                } else {
                    if (data.available_days.length === 0) {
                        errors.push('Deve essere selezionato almeno un giorno della settimana');
                    }
                    
                    const validDays = [1, 2, 3, 4, 5, 6, 7]; // 1=Lunedì, 7=Domenica
                    const invalidDays = data.available_days.filter(day => !validDays.includes(day));
                    if (invalidDays.length > 0) {
                        errors.push('Giorni della settimana non validi (valori consentiti: 1-7)');
                    }
                }
            }
        }

        if (errors.length > 0) {
            throw AppError.badRequest(`Dati non validi: ${errors.join(', ')}`);
        }
    }

    /**
     * Valida il formato dell'orario (HH:MM)
     * @param {string} time - Orario da validare
     * @returns {boolean} - true se valido
     */
    static isValidTimeFormat(time) {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return timeRegex.test(time);
    }

    /**
     * Serializzazione per JSON
     * @returns {Object} - Oggetto serializzato
     */
    toJSON() {
        return {
            id: this.space_id,
            locationId: this.location_id,
            spaceTypeId: this.space_type_id,
            name: this.space_name,
            description: this.description,
            capacity: this.capacity,
            pricePerHour: parseFloat(this.price_per_hour),
            pricePerDay: parseFloat(this.price_per_day),
            openingTime: this.opening_time,
            closingTime: this.closing_time,
            availableDays: this.available_days,
            location: this.location,
            spaceType: this.space_type
        };
    }

    // ============================================================================
    // METODI PER GESTIONE ORARI DI DISPONIBILITÀ
    // ============================================================================

    /**
     * Verifica se uno spazio è disponibile per un determinato periodo considerando gli orari di apertura
     * @param {number} spaceId - ID dello spazio
     * @param {string} startDatetime - Data/ora inizio (ISO string)
     * @param {string} endDatetime - Data/ora fine (ISO string)
     * @returns {Promise<Object>} - Risultato verifica con dettagli
     */
    static async checkAvailabilityWithSchedule(spaceId, startDatetime, endDatetime) {
        try {
            // 1. Ottieni informazioni spazio con orari
            const space = await this.findById(spaceId);
            if (!space) {
                throw AppError.notFound('Spazio non trovato');
            }

            if (space.status !== 'active') {
                return {
                    available: false,
                    reason: 'space_inactive',
                    message: `Lo spazio è in stato: ${space.status}`
                };
            }

            const startDate = new Date(startDatetime);
            const endDate = new Date(endDatetime);

            // 2. Verifica durata prenotazione
            const durationHours = (endDate - startDate) / (1000 * 60 * 60);
            
            if (durationHours < space.min_booking_hours) {
                return {
                    available: false,
                    reason: 'duration_too_short',
                    message: `Durata minima prenotazione: ${space.min_booking_hours} ore`,
                    min_hours: space.min_booking_hours
                };
            }

            if (durationHours > space.max_booking_hours) {
                return {
                    available: false,
                    reason: 'duration_too_long',
                    message: `Durata massima prenotazione: ${space.max_booking_hours} ore`,
                    max_hours: space.max_booking_hours
                };
            }

            // 3. Verifica advance booking
            const now = new Date();
            const daysInAdvance = (startDate - now) / (1000 * 60 * 60 * 24);
            
            if (daysInAdvance > space.booking_advance_days) {
                return {
                    available: false,
                    reason: 'too_far_in_advance',
                    message: `Non è possibile prenotare con più di ${space.booking_advance_days} giorni di anticipo`,
                    max_advance_days: space.booking_advance_days
                };
            }

            // 4. Verifica orari di apertura per ogni giorno del periodo
            const scheduleCheck = await this.checkScheduleCompatibility(space, startDate, endDate);
            
            if (!scheduleCheck.compatible) {
                return {
                    available: false,
                    reason: 'outside_operating_hours',
                    message: scheduleCheck.message,
                    operating_hours: scheduleCheck.operating_hours,
                    violations: scheduleCheck.violations
                };
            }

            // 5. Verifica sovrapposizioni con altre prenotazioni
            const Booking = require('./Booking');
            const conflicts = await Booking.findOverlappingBookings(spaceId, startDatetime, endDatetime);
            
            if (conflicts.length > 0) {
                return {
                    available: false,
                    reason: 'conflicting_bookings',
                    message: 'Periodo in conflitto con altre prenotazioni',
                    conflicting_bookings: conflicts
                };
            }

            // Tutto ok!
            return {
                available: true,
                message: 'Spazio disponibile per il periodo richiesto',
                space_info: {
                    name: space.space_name,
                    opening_time: space.opening_time,
                    closing_time: space.closing_time,
                    available_days: space.available_days
                },
                duration_hours: durationHours
            };

        } catch (error) {
            throw AppError.internal('Errore durante la verifica disponibilità', error);
        }
    }

    /**
     * Verifica compatibilità con orari di apertura per un periodo
     * @param {Space} space - Oggetto spazio con orari
     * @param {Date} startDate - Data inizio
     * @param {Date} endDate - Data fine
     * @returns {Promise<Object>} - Risultato verifica
     */
    static async checkScheduleCompatibility(space, startDate, endDate) {
        const violations = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay(); // 0=Domenica, 1=Lunedì, ...
            const dayOfWeekISO = dayOfWeek === 0 ? 7 : dayOfWeek; // Converti a ISO (1=Lunedì, 7=Domenica)
            
            // Verifica se il giorno è disponibile
            if (!space.available_days.includes(dayOfWeekISO)) {
                violations.push({
                    date: currentDate.toISOString().split('T')[0],
                    day_of_week: dayOfWeekISO,
                    reason: 'day_not_available',
                    message: `${this.getDayName(dayOfWeekISO)} non è un giorno disponibile`
                });
            }

            // Verifica orari per questo giorno
            const dayStart = new Date(currentDate);
            const dayEnd = new Date(currentDate);
            
            // Se è il primo giorno, usa l'orario di inizio della prenotazione
            if (currentDate.getTime() === startDate.getTime()) {
                const requestedStartTime = startDate.toTimeString().split(' ')[0];
                if (requestedStartTime < space.opening_time) {
                    violations.push({
                        date: currentDate.toISOString().split('T')[0],
                        requested_time: requestedStartTime,
                        opening_time: space.opening_time,
                        reason: 'before_opening',
                        message: `Orario richiesto ${requestedStartTime} è prima dell'apertura ${space.opening_time}`
                    });
                }
            }

            // Se è l'ultimo giorno, usa l'orario di fine della prenotazione
            if (currentDate.toDateString() === endDate.toDateString()) {
                const requestedEndTime = endDate.toTimeString().split(' ')[0];
                if (requestedEndTime > space.closing_time) {
                    violations.push({
                        date: currentDate.toISOString().split('T')[0],
                        requested_time: requestedEndTime,
                        closing_time: space.closing_time,
                        reason: 'after_closing',
                        message: `Orario richiesto ${requestedEndTime} è dopo la chiusura ${space.closing_time}`
                    });
                }
            }

            // Vai al giorno successivo
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return {
            compatible: violations.length === 0,
            violations: violations,
            message: violations.length === 0 ? 
                'Orari compatibili con il calendario dello spazio' : 
                `${violations.length} violazioni degli orari di apertura`,
            operating_hours: {
                opening_time: space.opening_time,
                closing_time: space.closing_time,
                available_days: space.available_days
            }
        };
    }

    /**
     * Ottieni slot disponibili per uno spazio in una data specifica
     * @param {number} spaceId - ID dello spazio
     * @param {string} date - Data nel formato YYYY-MM-DD
     * @returns {Promise<Object>} - Slot disponibili
     */
    static async getAvailableSlots(spaceId, date) {
        try {
            const space = await this.findById(spaceId);
            if (!space || space.status !== 'active') {
                throw AppError.notFound('Spazio non trovato o non attivo');
            }

            const targetDate = new Date(date);
            const dayOfWeek = targetDate.getDay();
            const dayOfWeekISO = dayOfWeek === 0 ? 7 : dayOfWeek;

            // Verifica se il giorno è disponibile
            if (!space.available_days.includes(dayOfWeekISO)) {
                return {
                    date: date,
                    space_id: spaceId,
                    available: false,
                    reason: 'day_not_available',
                    message: `${this.getDayName(dayOfWeekISO)} non è disponibile`,
                    available_slots: []
                };
            }

            // Ottieni prenotazioni esistenti per questa data
            const Booking = require('./Booking');
            const existingBookings = await Booking.getSpaceAvailabilityForDate(spaceId, date);

            // Genera slot disponibili (esempio: slot da 1 ora)
            const slots = [];
            const openingTime = this.timeToMinutes(space.opening_time);
            const closingTime = this.timeToMinutes(space.closing_time);
            const slotDuration = 60; // 60 minuti per slot

            for (let minutes = openingTime; minutes < closingTime; minutes += slotDuration) {
                const slotStart = this.minutesToTime(minutes);
                const slotEnd = this.minutesToTime(minutes + slotDuration);
                
                // Verifica se questo slot è libero
                const isOccupied = existingBookings.some(booking => {
                    const bookingStart = booking.start_datetime;
                    const bookingEnd = booking.end_datetime;
                    const slotStartDateTime = `${date}T${slotStart}`;
                    const slotEndDateTime = `${date}T${slotEnd}`;
                    
                    return (bookingStart < slotEndDateTime && bookingEnd > slotStartDateTime);
                });

                slots.push({
                    start_time: slotStart,
                    end_time: slotEnd,
                    available: !isOccupied,
                    duration_minutes: slotDuration
                });
            }

            return {
                date: date,
                space_id: spaceId,
                space_name: space.space_name,
                available: true,
                operating_hours: {
                    opening_time: space.opening_time,
                    closing_time: space.closing_time
                },
                total_slots: slots.length,
                available_slots: slots.filter(slot => slot.available),
                occupied_slots: slots.filter(slot => !slot.available),
                all_slots: slots
            };

        } catch (error) {
            throw AppError.internal('Errore durante il calcolo degli slot disponibili', error);
        }
    }

    // ============================================================================
    // METODI UTILITY
    // ============================================================================

    /**
     * Converte tempo in minuti
     * @param {string} time - Tempo nel formato HH:MM:SS
     * @returns {number} - Minuti dal midnight
     */
    static timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    /**
     * Converte minuti in tempo
     * @param {number} minutes - Minuti dal midnight
     * @returns {string} - Tempo nel formato HH:MM:SS
     */
    static minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
    }

    /**
     * Ottieni nome del giorno
     * @param {number} dayOfWeek - Giorno della settimana (1=Lunedì, 7=Domenica)
     * @returns {string} - Nome del giorno
     */
    static getDayName(dayOfWeek) {
        const days = {
            1: 'Lunedì',
            2: 'Martedì', 
            3: 'Mercoledì',
            4: 'Giovedì',
            5: 'Venerdì',
            6: 'Sabato',
            7: 'Domenica'
        };
        return days[dayOfWeek] || 'Sconosciuto';
    }
}

module.exports = Space;
