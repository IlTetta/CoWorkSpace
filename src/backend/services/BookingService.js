// src/backend/services/BookingService.js
const Booking = require('../models/Booking');
const Space = require('../models/Space');
const User = require('../models/User');
const AppError = require('../utils/AppError');

/**
 * Service per gestire la logica di business delle prenotazioni
 */
class BookingService {
    /**
     * Crea una nuova prenotazione con validazioni e business logic
     * @param {Object} currentUser - Utente che fa la richiesta
     * @param {Object} bookingData - Dati della prenotazione
     * @returns {Promise<Booking>} - Prenotazione creata
     */
    static async createBooking(currentUser, bookingData) {
        // Verifica che l'utente possa creare prenotazioni
        if (!currentUser || !currentUser.user_id) {
            throw AppError.unauthorized('Utente non autenticato');
        }

        // Gli utenti normali possono prenotare solo per se stessi
        if (currentUser.role === 'user' && bookingData.user_id !== currentUser.user_id) {
            throw AppError.forbidden('Puoi creare prenotazioni solo per te stesso');
        }

        // Verifica che lo spazio esista
        const space = await Space.findById(bookingData.space_id);
        if (!space) {
            throw AppError.notFound('Spazio non trovato');
        }

        // Calcola automaticamente total_hours se non fornito
        if (!bookingData.total_hours && bookingData.start_time && bookingData.end_time) {
            bookingData.total_hours = this.calculateHours(bookingData.start_time, bookingData.end_time);
        }

        // Calcola automaticamente total_price se non fornito
        if (!bookingData.total_price && bookingData.total_hours) {
            const pricing = await this.calculateBookingPrice(
                bookingData.space_id,
                bookingData.booking_date,
                bookingData.start_time,
                bookingData.end_time
            );
            bookingData.total_price = pricing.finalPrice;
        }

        // Verifica che la data di prenotazione sia futura
        const bookingDate = new Date(bookingData.booking_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (bookingDate < today) {
            throw AppError.badRequest('Non puoi prenotare per date passate');
        }

        return await Booking.create(bookingData);
    }

    /**
     * Aggiorna una prenotazione esistente
     * @param {Object} currentUser - Utente che fa la richiesta
     * @param {number} bookingId - ID della prenotazione
     * @param {Object} updateData - Dati da aggiornare
     * @returns {Promise<Booking>} - Prenotazione aggiornata
     */
    static async updateBooking(currentUser, bookingId, updateData) {
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            throw AppError.notFound('Prenotazione non trovata');
        }

        // Verifica autorizzazioni
        const canEdit = await this.canManageBooking(booking, currentUser);
        if (!canEdit) {
            throw AppError.forbidden('Non hai i permessi per modificare questa prenotazione');
        }

        // Se la prenotazione è già confermata, limita le modifiche
        if (booking.status === 'confirmed' && currentUser.role === 'user') {
            const allowedFields = ['status']; // L'utente può solo cancellare
            const invalidFields = Object.keys(updateData).filter(field => !allowedFields.includes(field));
            
            if (invalidFields.length > 0) {
                throw AppError.badRequest('Non puoi modificare una prenotazione confermata. Puoi solo cancellarla.');
            }
            
            if (updateData.status && updateData.status !== 'cancelled') {
                throw AppError.badRequest('Puoi solo cancellare una prenotazione confermata');
            }
        }

        // Ricalcola hours e price se necessario
        if (updateData.start_time || updateData.end_time) {
            const startTime = updateData.start_time || booking.start_time;
            const endTime = updateData.end_time || booking.end_time;
            updateData.total_hours = this.calculateHours(startTime, endTime);
            
            // Ricalcola il prezzo
            const pricing = await this.calculateBookingPrice(
                booking.space_id,
                updateData.booking_date || booking.booking_date,
                startTime,
                endTime
            );
            updateData.total_price = pricing.finalPrice;
        }

        return await Booking.update(bookingId, updateData);
    }

    /**
     * Elimina una prenotazione
     * @param {Object} currentUser - Utente che fa la richiesta
     * @param {number} bookingId - ID della prenotazione
     * @returns {Promise<boolean>} - true se eliminata
     */
    static async deleteBooking(currentUser, bookingId) {
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            throw AppError.notFound('Prenotazione non trovata');
        }

        // Verifica autorizzazioni
        const canDelete = await this.canManageBooking(booking, currentUser);
        if (!canDelete) {
            throw AppError.forbidden('Non hai i permessi per eliminare questa prenotazione');
        }

        // Solo admin possono eliminare prenotazioni confermate
        if (booking.status === 'confirmed' && currentUser.role !== 'admin') {
            throw AppError.forbidden('Solo gli amministratori possono eliminare prenotazioni confermate');
        }

        return await Booking.delete(bookingId);
    }

    /**
     * Ottieni lista prenotazioni con filtri e autorizzazioni
     * @param {Object} currentUser - Utente che fa la richiesta
     * @param {Object} filters - Filtri di ricerca
     * @returns {Promise<Array<Booking>>} - Lista prenotazioni
     */
    static async getBookings(currentUser, filters = {}) {
        // Gli utenti normali vedono solo le proprie prenotazioni
        if (currentUser && currentUser.role === 'user') {
            filters.user_id = currentUser.user_id;
        }

        // I manager vedono solo le prenotazioni delle loro location
        if (currentUser && currentUser.role === 'manager') {
            // Ottieni le location gestite dal manager
            const managedLocations = await this.getManagedLocationIds(currentUser.user_id);
            if (managedLocations.length > 0) {
                filters.location_id = managedLocations;
            } else {
                // Se non gestisce location, vede solo le sue prenotazioni
                filters.user_id = currentUser.user_id;
            }
        }

        return await Booking.findAll(filters);
    }

    /**
     * Ottieni dettagli di una prenotazione specifica
     * @param {Object} currentUser - Utente che fa la richiesta
     * @param {number} bookingId - ID della prenotazione
     * @returns {Promise<Booking>} - Dettagli prenotazione
     */
    static async getBookingDetails(currentUser, bookingId) {
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            throw AppError.notFound('Prenotazione non trovata');
        }

        // Verifica autorizzazioni per visualizzare
        if (currentUser) {
            const canView = await this.canViewBooking(booking, currentUser);
            if (!canView) {
                throw AppError.forbidden('Non hai i permessi per visualizzare questa prenotazione');
            }
        }

        return booking;
    }

    /**
     * Calcola il prezzo di una prenotazione
     * @param {number} spaceId - ID dello spazio
     * @param {string} date - Data prenotazione
     * @param {string} startTime - Ora inizio
     * @param {string} endTime - Ora fine
     * @returns {Promise<Object>} - Dettagli pricing
     */
    static async calculateBookingPrice(spaceId, date, startTime, endTime) {
        const space = await Space.findById(spaceId);
        if (!space) {
            throw AppError.notFound('Spazio non trovato');
        }

        const totalHours = this.calculateHours(startTime, endTime);
        const totalDays = Math.ceil(totalHours / 24);

        const hourlyPrice = totalHours * parseFloat(space.price_per_hour);
        const dailyPrice = totalDays * parseFloat(space.price_per_day);

        const finalPrice = Math.min(hourlyPrice, dailyPrice);

        return {
            spaceId,
            date,
            startTime,
            endTime,
            totalHours,
            totalDays,
            hourlyPrice: parseFloat(hourlyPrice.toFixed(2)),
            dailyPrice: parseFloat(dailyPrice.toFixed(2)),
            finalPrice: parseFloat(finalPrice.toFixed(2)),
            selectedPricing: finalPrice === hourlyPrice ? 'hourly' : 'daily',
            space: {
                id: space.space_id,
                name: space.name,
                price_per_hour: space.price_per_hour,
                price_per_day: space.price_per_day
            }
        };
    }

    /**
     * Dashboard prenotazioni per manager
     * @param {Object} currentUser - Manager che fa la richiesta
     * @param {Object} filters - Filtri per la dashboard
     * @returns {Promise<Object>} - Dati dashboard
     */
    static async getBookingsDashboard(currentUser, filters = {}) {
        if (!['manager', 'admin'].includes(currentUser.role)) {
            throw AppError.forbidden('Solo manager e admin possono accedere alla dashboard');
        }

        // Filtri per manager
        if (currentUser.role === 'manager') {
            const managedLocations = await this.getManagedLocationIds(currentUser.user_id);
            if (managedLocations.length === 0) {
                throw AppError.forbidden('Non gestisci alcuna location');
            }
            filters.location_id = managedLocations;
        }

        // Ottieni statistiche
        const stats = await Booking.getStats(filters);
        
        // Ottieni prenotazioni recenti
        const recentBookings = await Booking.findAll({
            ...filters,
            limit: 10
        });

        return {
            stats,
            recentBookings,
            filters
        };
    }

    /**
     * Verifica disponibilità spazio per un determinato periodo
     * @param {number} spaceId - ID dello spazio
     * @param {string} date - Data prenotazione
     * @param {string} startTime - Ora inizio
     * @param {string} endTime - Ora fine
     * @returns {Promise<Object>} - Risultato disponibilità
     */
    static async checkAvailability(spaceId, date, startTime, endTime) {
        // Verifica che lo spazio esista
        const space = await Space.findById(spaceId);
        if (!space) {
            throw AppError.notFound('Spazio non trovato');
        }

        // Verifica disponibilità
        const isAvailable = await Booking.checkSpaceAvailability(spaceId, date, startTime, endTime);
        
        // Calcola prezzo se disponibile
        let pricing = null;
        if (isAvailable) {
            pricing = await this.calculateBookingPrice(spaceId, date, startTime, endTime);
        }

        return {
            available: isAvailable,
            space: {
                id: space.space_id,
                name: space.name,
                capacity: space.capacity,
                status: space.status
            },
            pricing
        };
    }

    // ============================================================================
    // UTILITY E HELPER METHODS
    // ============================================================================

    /**
     * Verifica se un utente può gestire una prenotazione
     * @param {Booking} booking - Prenotazione
     * @param {Object} user - Utente
     * @returns {Promise<boolean>} - true se può gestire
     */
    static async canManageBooking(booking, user) {
        // Admin possono tutto
        if (user.role === 'admin') return true;
        
        // Proprietario della prenotazione
        if (booking.user_id === user.user_id) return true;
        
        // Manager delle location
        if (user.role === 'manager') {
            return await this.canManageBookingLocation(booking, user);
        }
        
        return false;
    }

    /**
     * Verifica se un utente può visualizzare una prenotazione
     * @param {Booking} booking - Prenotazione
     * @param {Object} user - Utente
     * @returns {Promise<boolean>} - true se può visualizzare
     */
    static async canViewBooking(booking, user) {
        // Stesse regole del manage per ora
        return await this.canManageBooking(booking, user);
    }

    /**
     * Verifica se un manager può gestire prenotazioni in una location
     * @param {Booking} booking - Prenotazione
     * @param {Object} manager - Manager
     * @returns {Promise<boolean>} - true se può gestire
     */
    static async canManageBookingLocation(booking, manager) {
        const managedLocations = await this.getManagedLocationIds(manager.user_id);
        
        // Ottieni la location_id dalla prenotazione (via space)
        const space = await Space.findById(booking.space_id);
        if (!space) return false;
        
        return managedLocations.includes(space.location_id);
    }

    /**
     * Ottieni gli ID delle location gestite da un manager
     * @param {number} managerId - ID del manager
     * @returns {Promise<Array<number>>} - Array di location IDs
     */
    static async getManagedLocationIds(managerId) {
        // Implementazione semplificata - potrebbe essere più complessa
        const Location = require('../models/Location');
        const locations = await Location.findAll({ manager_id: managerId });
        return locations.map(loc => loc.location_id);
    }

    /**
     * Calcola le ore tra due orari
     * @param {string} startTime - Ora inizio (HH:MM:SS)
     * @param {string} endTime - Ora fine (HH:MM:SS)
     * @returns {number} - Ore totali
     */
    static calculateHours(startTime, endTime) {
        const [startHour, startMin, startSec] = startTime.split(':').map(Number);
        const [endHour, endMin, endSec] = endTime.split(':').map(Number);
        
        const startTotalMinutes = startHour * 60 + startMin + startSec / 60;
        const endTotalMinutes = endHour * 60 + endMin + endSec / 60;
        
        const diffMinutes = endTotalMinutes - startTotalMinutes;
        return parseFloat((diffMinutes / 60).toFixed(2));
    }
}

module.exports = BookingService;
