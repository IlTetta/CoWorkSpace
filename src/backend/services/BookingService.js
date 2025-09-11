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

        // I manager possono prenotare per clienti delle location che gestiscono
        // Questo permette l'assistenza clienti e la gestione operativa
        if (currentUser.role === 'manager' && bookingData.user_id !== currentUser.user_id) {
            // Verifica che il manager gestisca la location dello spazio prenotato
            const space = await Space.findById(bookingData.space_id);
            if (!space) {
                throw AppError.badRequest('Spazio non trovato');
            }
            
            const canManageSpace = await this.canManageSpaceLocation(space, currentUser);
            if (!canManageSpace) {
                throw AppError.forbidden('Puoi prenotare per clienti solo negli spazi delle tue location');
            }
        }

        // Verifica che lo spazio esista
        const space = await Space.findById(bookingData.space_id);
        if (!space) {
            throw AppError.notFound('Spazio non trovato');
        }

        // Calcola automaticamente total_price se non fornito
        if (!bookingData.total_price) {
            const pricing = await this.calculateDailyBookingPrice(
                bookingData.space_id,
                bookingData.start_date,
                bookingData.end_date
            );
            bookingData.total_price = pricing.finalPrice;
        }

        // Verifica che la data di prenotazione sia futura o odierna
        const startDate = new Date(bookingData.start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (startDate < today) {
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

        // Ricalcola il prezzo se necessario
        if (updateData.start_date || updateData.end_date) {
            const startDate = updateData.start_date || booking.start_date;
            const endDate = updateData.end_date || booking.end_date;
            
            // Ricalcola il prezzo
            const pricing = await this.calculateDailyBookingPrice(
                booking.space_id,
                startDate,
                endDate
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

        // I manager vedono TUTTE le prenotazioni delle location che gestiscono
        // Questo è fondamentale per la gestione operativa delle sedi:
        // - Monitoraggio occupazione
        // - Assistenza clienti
        // - Gestione conflitti
        // - Reportistica
        if (currentUser && currentUser.role === 'manager') {
            // Ottieni le location gestite dal manager
            const managedLocations = await this.getManagedLocationIds(currentUser.user_id);
            if (managedLocations.length > 0) {
                filters.location_id = managedLocations;
                // IMPORTANTE: Non limitare per user_id - manager deve vedere tutto
            } else {
                // Se non gestisce location, vede solo le sue prenotazioni personali
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
     * Calcola il prezzo di una prenotazione giornaliera
     * @param {number} spaceId - ID dello spazio
     * @param {string} startDate - Data inizio (YYYY-MM-DD)
     * @param {string} endDate - Data fine (YYYY-MM-DD)
     * @returns {Promise<Object>} - Dettagli pricing
     */
    static async calculateDailyBookingPrice(spaceId, startDate, endDate) {
        const space = await Space.findById(spaceId);
        if (!space) {
            throw AppError.notFound('Spazio non trovato');
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = end.getTime() - start.getTime();
        const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 per includere il giorno di fine

        const dailyPrice = totalDays * parseFloat(space.price_per_day);

        return {
            spaceId,
            startDate,
            endDate,
            totalDays,
            pricePerDay: parseFloat(space.price_per_day),
            finalPrice: parseFloat(dailyPrice.toFixed(2)),
            space: {
                id: space.space_id,
                name: space.space_name,
                price_per_day: space.price_per_day
            }
        };
    }

    /**
     * Calcola il prezzo di una prenotazione (metodo legacy per compatibilità)
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
     * Verifica disponibilità spazio per un determinato periodo (giornaliero)
     * @param {number} spaceId - ID dello spazio
     * @param {string} startDate - Data inizio prenotazione
     * @param {string} endDate - Data fine prenotazione (opzionale)
     * @returns {Promise<Object>} - Risultato disponibilità
     */
    static async checkAvailability(spaceId, startDate, endDate = null) {
        // Se non specificata, la data di fine è uguale a quella di inizio
        if (!endDate) {
            endDate = startDate;
        }

        // Usa la nuova logica di controllo giornaliero
        const Space = require('../models/Space');
        const availability = await Space.checkDailyAvailability(spaceId, startDate, endDate);

        return availability;
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
     * Verifica se un manager può gestire uno spazio specifico
     * @param {Object} space - Spazio 
     * @param {Object} manager - Manager
     * @returns {Promise<boolean>} - true se può gestire
     */
    static async canManageSpaceLocation(space, manager) {
        if (manager.role === 'admin') return true;
        if (manager.role !== 'manager') return false;
        
        const managedLocations = await this.getManagedLocationIds(manager.user_id);
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
