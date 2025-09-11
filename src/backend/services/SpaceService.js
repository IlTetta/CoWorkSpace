// src/backend/services/SpaceService.js
const Space = require('../models/Space');
const Location = require('../models/Location');
const AppError = require('../utils/AppError');

/**
 * Service per gestire la logica di business degli spazi
 */
class SpaceService {
    /**
     * Crea un nuovo spazio con validazioni avanzate
     * @param {Object} spaceData - Dati dello spazio
     * @param {Object} currentUser - Utente che fa la richiesta
     * @returns {Promise<Space>} - Spazio creato
     */
    static async createSpace(spaceData, currentUser) {
        // Solo admin e manager possono creare spazi
        if (!['admin', 'manager'].includes(currentUser.role)) {
            throw AppError.forbidden('Non hai i permessi per creare uno spazio');
        }

        // Verifica che la location esista
        const location = await Location.findById(spaceData.location_id);
        if (!location) {
            throw AppError.badRequest('Location non trovata');
        }

        // I manager possono creare spazi solo nelle loro location
        if (currentUser.role === 'manager' && location.manager_id !== currentUser.user_id) {
            throw AppError.forbidden('Puoi creare spazi solo nelle tue location');
        }

        return await Space.create(spaceData);
    }

    /**
     * Aggiorna uno spazio con controlli di autorizzazione
     * @param {number} spaceId - ID dello spazio
     * @param {Object} updateData - Dati da aggiornare
     * @param {Object} currentUser - Utente che fa la richiesta
     * @returns {Promise<Space>} - Spazio aggiornato
     */
    static async updateSpace(spaceId, updateData, currentUser) {
        const space = await Space.findById(spaceId);
        if (!space) {
            throw AppError.notFound('Spazio non trovato');
        }

        // Verifica autorizzazioni
        const canEdit = await this.canManageSpace(space, currentUser);
        if (!canEdit) {
            throw AppError.forbidden('Non hai i permessi per modificare questo spazio');
        }

        return await Space.update(spaceId, updateData);
    }

    /**
     * Elimina uno spazio con controlli di sicurezza
     * @param {number} spaceId - ID dello spazio
     * @param {Object} currentUser - Utente che fa la richiesta
     * @returns {Promise<boolean>} - true se eliminato
     */
    static async deleteSpace(spaceId, currentUser) {
        const space = await Space.findById(spaceId);
        if (!space) {
            throw AppError.notFound('Spazio non trovato');
        }

        // Verifica autorizzazioni
        const canDelete = await this.canManageSpace(space, currentUser);
        if (!canDelete) {
            throw AppError.forbidden('Non hai i permessi per eliminare questo spazio');
        }

        return await Space.delete(spaceId);
    }

    /**
     * Ottieni spazi filtrati in base ai permessi dell'utente
     * @param {Object} filters - Filtri di ricerca
     * @param {Object} currentUser - Utente che fa la richiesta (può essere null per richieste pubbliche)
     * @returns {Promise<Space[]>} - Array di spazi
     */
    static async getSpaces(filters, currentUser = null) {
        // I manager possono vedere solo gli spazi delle loro location
        if (currentUser && currentUser.role === 'manager') {
            // Trova le location gestite dal manager
            const userLocations = await Location.findByManager(currentUser.user_id);
            const locationIds = userLocations.map(loc => loc.location_id);
            
            if (locationIds.length === 0) {
                return []; // Nessuna location gestita
            }

            // Se non è specificata una location, filtra per le location del manager
            if (!filters.location_id) {
                // Restituisci spazi da tutte le location del manager
                const allSpaces = [];
                for (const locationId of locationIds) {
                    const spaces = await Space.findByLocation(locationId);
                    allSpaces.push(...spaces);
                }
                return allSpaces;
            } else {
                // Verifica che la location richiesta sia gestita dal manager
                if (!locationIds.includes(parseInt(filters.location_id))) {
                    throw AppError.forbidden('Non hai accesso a questa location');
                }
            }
        }

        return await Space.findAll(filters);
    }

    /**
     * Ottieni dati base di uno spazio per ID (per modifica)
     * @param {number} spaceId - ID dello spazio
     * @param {Object} currentUser - Utente che fa la richiesta
     * @returns {Promise<Object>} - Spazio con dati base
     */
    static async getSpaceById(spaceId, currentUser = null) {
        // Usa il metodo semplice del modello senza statistiche
        const space = await Space.findById(spaceId);
        if (!space) {
            throw AppError.notFound('Spazio non trovato');
        }

        // Verifica permessi se è un manager
        if (currentUser && currentUser.role === 'manager') {
            const canView = await this.canManageSpace(space, currentUser);
            if (!canView) {
                throw AppError.forbidden('Non hai i permessi per visualizzare questo spazio');
            }
        }

        return space;
    }

    /**
     * Ottieni dettagli completi di uno spazio
     * @param {number} spaceId - ID dello spazio
     * @param {Object} currentUser - Utente che fa la richiesta (può essere null)
     * @returns {Promise<Object>} - Spazio con statistiche
     */
    static async getSpaceDetails(spaceId, currentUser = null) {
        const space = await Space.findById(spaceId);
        if (!space) {
            throw AppError.notFound('Spazio non trovato');
        }

        // I manager possono vedere dettagli solo dei loro spazi
        if (currentUser && currentUser.role === 'manager') {
            const canView = await this.canManageSpace(space, currentUser);
            if (!canView) {
                // Per i manager, restituisci solo i dati base senza statistiche
                return {
                    space: space.toJSON(),
                    statistics: null
                };
            }
        }

        // Ottieni statistiche (solo per admin e manager proprietari)
        let stats = null;
        if (!currentUser || ['admin', 'manager'].includes(currentUser.role)) {
            stats = await Space.getStats(spaceId);
        }

        return {
            space: space.toJSON(),
            statistics: stats
        };
    }

    /**
     * Cerca spazi disponibili per prenotazione
     * @param {Object} searchCriteria - Criteri di ricerca
     * @returns {Promise<Space[]>} - Spazi disponibili
     */
    static async searchAvailableSpaces(searchCriteria) {
        const {
            startDate,
            endDate,
            city,
            location_id,
            capacity,
            space_type_id,
            max_price_hour
        } = searchCriteria;

        const criteria = {
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            city,
            location_id,
            capacity: capacity ? parseInt(capacity) : null,
            space_type_id: space_type_id ? parseInt(space_type_id) : null,
            max_price_hour: max_price_hour ? parseFloat(max_price_hour) : null
        };

        return await Space.findAvailable(criteria);
    }

    /**
     * Verifica disponibilità di uno spazio
     * @param {number} spaceId - ID dello spazio
     * @param {Date} startTime - Inizio periodo
     * @param {Date} endTime - Fine periodo
     * @returns {Promise<Object>} - Risultato disponibilità
     */
    static async checkSpaceAvailability(spaceId, startTime, endTime) {
        const space = await Space.findById(spaceId);
        if (!space) {
            throw AppError.notFound('Spazio non trovato');
        }

        const isAvailable = await Space.checkAvailability(spaceId, startTime, endTime);

        return {
            spaceId,
            available: isAvailable,
            period: {
                start: startTime,
                end: endTime
            },
            space: space.toJSON()
        };
    }

    /**
     * Ottieni spazi per location con statistiche
     * @param {number} locationId - ID della location
     * @param {Object} currentUser - Utente che fa la richiesta
     * @returns {Promise<Object>} - Spazi e statistiche aggregate
     */
    static async getSpacesByLocation(locationId, currentUser) {
        // Verifica che la location esista
        const location = await Location.findById(locationId);
        if (!location) {
            throw AppError.notFound('Location non trovata');
        }

        // Verifica autorizzazioni per manager
        if (currentUser.role === 'manager' && location.manager_id !== currentUser.user_id) {
            throw AppError.forbidden('Non hai accesso a questa location');
        }

        const spaces = await Space.findByLocation(locationId);

        // Calcola statistiche aggregate
        const aggregateStats = {
            totalSpaces: spaces.length,
            totalCapacity: spaces.reduce((sum, space) => sum + space.capacity, 0),
            averagePricePerHour: spaces.length > 0 
                ? spaces.reduce((sum, space) => sum + parseFloat(space.price_per_hour), 0) / spaces.length 
                : 0,
            priceRange: {
                min: spaces.length > 0 ? Math.min(...spaces.map(s => parseFloat(s.price_per_hour))) : 0,
                max: spaces.length > 0 ? Math.max(...spaces.map(s => parseFloat(s.price_per_hour))) : 0
            }
        };

        return {
            location: location.toJSON(),
            spaces: spaces.map(space => space.toJSON()),
            statistics: aggregateStats
        };
    }

    /**
     * Dashboard per gestione spazi di un manager
     * @param {Object} currentUser - Manager corrente
     * @returns {Promise<Object>} - Dati dashboard
     */
    static async getSpacesDashboard(currentUser) {
        if (currentUser.role !== 'manager' && currentUser.role !== 'admin') {
            throw AppError.forbidden('Accesso riservato ai manager');
        }

        let allSpaces = [];
        let locations = [];

        if (currentUser.role === 'admin') {
            // Admin vede tutti gli spazi
            allSpaces = await Space.findAll();
            locations = await Location.findAll();
        } else {
            // Manager vede solo i suoi spazi
            locations = await Location.findByManager(currentUser.user_id);
            for (const location of locations) {
                const locationSpaces = await Space.findByLocation(location.location_id);
                allSpaces.push(...locationSpaces);
            }
        }

        // Calcola statistiche totali
        const totalStats = {
            totalSpaces: allSpaces.length,
            totalLocations: locations.length,
            totalCapacity: allSpaces.reduce((sum, space) => sum + space.capacity, 0),
            averagePricePerHour: allSpaces.length > 0 
                ? allSpaces.reduce((sum, space) => sum + parseFloat(space.price_per_hour), 0) / allSpaces.length 
                : 0
        };

        // Raggruppa per location
        const spacesByLocation = {};
        for (const space of allSpaces) {
            if (!spacesByLocation[space.location_id]) {
                const location = locations.find(loc => loc.location_id === space.location_id);
                spacesByLocation[space.location_id] = {
                    location: location ? location.toJSON() : null,
                    spaces: [],
                    stats: {
                        count: 0,
                        totalCapacity: 0,
                        avgPrice: 0
                    }
                };
            }
            
            spacesByLocation[space.location_id].spaces.push(space.toJSON());
            spacesByLocation[space.location_id].stats.count++;
            spacesByLocation[space.location_id].stats.totalCapacity += space.capacity;
        }

        // Calcola medie per location
        Object.values(spacesByLocation).forEach(locationData => {
            if (locationData.stats.count > 0) {
                locationData.stats.avgPrice = 
                    locationData.spaces.reduce((sum, space) => sum + space.pricePerHour, 0) / locationData.stats.count;
            }
        });

        return {
            totalStats,
            locationBreakdown: Object.values(spacesByLocation)
        };
    }

    /**
     * Verifica se un utente può gestire uno spazio
     * @param {Space} space - Spazio da verificare
     * @param {Object} user - Utente da verificare
     * @returns {Promise<boolean>} - true se può gestire
     */
    static async canManageSpace(space, user) {
        // Admin può gestire tutti gli spazi
        if (user.role === 'admin') {
            return true;
        }

        // Manager può gestire solo gli spazi delle sue location
        if (user.role === 'manager') {
            const location = await Location.findById(space.location_id);
            return location && location.manager_id === user.user_id;
        }

        return false;
    }

    /**
     * Calcola prezzo per prenotazione
     * @param {number} spaceId - ID dello spazio
     * @param {Date} startTime - Inizio prenotazione
     * @param {Date} endTime - Fine prenotazione
     * @returns {Promise<Object>} - Dettagli prezzo
     */
    static async calculateBookingPrice(spaceId, startTime, endTime) {
        const space = await Space.findById(spaceId);
        if (!space) {
            throw AppError.notFound('Spazio non trovato');
        }

        // Converti le stringhe in oggetti Date
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);
        
        // Verifica che le date siano valide
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw AppError.badRequest('Date non valide');
        }

        const durationMs = endDate.getTime() - startDate.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        const durationDays = durationMs / (1000 * 60 * 60 * 24);

        // Calcola prezzo orario e giornaliero
        const hourlyPrice = durationHours * parseFloat(space.price_per_hour);
        const dailyPrice = Math.ceil(durationDays) * parseFloat(space.price_per_day);

        // Scegli il prezzo più conveniente
        const finalPrice = Math.min(hourlyPrice, dailyPrice);
        const pricingType = hourlyPrice <= dailyPrice ? 'hourly' : 'daily';

        return {
            spaceId,
            space: space.toJSON(),
            duration: {
                hours: durationHours,
                days: durationDays
            },
            pricing: {
                hourlyTotal: hourlyPrice,
                dailyTotal: dailyPrice,
                finalPrice,
                pricingType,
                savings: Math.abs(hourlyPrice - dailyPrice)
            }
        };
    }
}

module.exports = SpaceService;
