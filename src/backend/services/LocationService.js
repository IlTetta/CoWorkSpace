// src/backend/services/LocationService.js
const Location = require('../models/Location');
const User = require('../models/User');
const AppError = require('../utils/AppError');

/**
 * Service per gestire la logica di business delle locations
 */
class LocationService {
    /**
     * Ottieni tutte le locations gestite da un manager specifico
     * @param {number} managerId - ID del manager
     * @returns {Promise<Location[]>} - Array di locations gestite dal manager
     */
    static async getLocationsByManager(managerId) {
        if (!managerId) {
            throw AppError.badRequest('ID manager richiesto');
        }

        // Verifica che l'utente esista e sia un manager
        const manager = await User.findById(managerId);
        if (!manager) {
            throw AppError.notFound('Manager non trovato');
        }

        if (!['manager', 'admin'].includes(manager.role)) {
            throw AppError.badRequest('L\'utente specificato non ha il ruolo di manager');
        }

        const locations = await Location.findByManager(managerId);
        
        // Ritorna le locations con formato JSON
        return locations.map(location => location.toJSON());
    }

    /**
     * Crea una nuova location con validazioni avanzate
     * @param {Object} locationData - Dati della location
     * @param {Object} currentUser - Utente che fa la richiesta
     * @returns {Promise<Location>} - Location creata
     */
    static async createLocation(locationData, currentUser) {
        // Solo admin e manager possono creare locations
        if (!['admin', 'manager'].includes(currentUser.role)) {
            throw AppError.forbidden('Non hai i permessi per creare una location');
        }

        // Se non è admin, può creare solo location per se stesso
        if (currentUser.role === 'manager' && locationData.manager_id !== currentUser.user_id) {
            throw AppError.forbidden('Puoi creare location solo per te stesso');
        }

        // Verifica che il manager esista e abbia il ruolo giusto
        if (locationData.manager_id) {
            const manager = await User.findById(locationData.manager_id);
            if (!manager) {
                throw AppError.badRequest('Manager non trovato');
            }
            if (!['manager', 'admin'].includes(manager.role)) {
                throw AppError.badRequest('L\'utente specificato non ha il ruolo di manager');
            }
        }

        return await Location.create(locationData);
    }

    /**
     * Aggiorna una location con controlli di autorizzazione
     * @param {number} locationId - ID della location
     * @param {Object} updateData - Dati da aggiornare
     * @param {Object} currentUser - Utente che fa la richiesta
     * @returns {Promise<Location>} - Location aggiornata
     */
    static async updateLocation(locationId, updateData, currentUser) {
        const location = await Location.findById(locationId);
        if (!location) {
            throw AppError.notFound('Location non trovata');
        }

        // Controlli di autorizzazione
        const canEdit = this.canManageLocation(location, currentUser);
        if (!canEdit) {
            throw AppError.forbidden('Non hai i permessi per modificare questa location');
        }

        // Se si sta cambiando manager, verifica che sia valido
        if (updateData.manager_id && updateData.manager_id !== location.manager_id) {
            const newManager = await User.findById(updateData.manager_id);
            if (!newManager) {
                throw AppError.badRequest('Nuovo manager non trovato');
            }
            if (!['manager', 'admin'].includes(newManager.role)) {
                throw AppError.badRequest('L\'utente specificato non ha il ruolo di manager');
            }
        }

        return await Location.update(locationId, updateData);
    }

    /**
     * Elimina una location con controlli di sicurezza
     * @param {number} locationId - ID della location
     * @param {Object} currentUser - Utente che fa la richiesta
     * @returns {Promise<boolean>} - true se eliminata
     */
    static async deleteLocation(locationId, currentUser) {
        const location = await Location.findById(locationId);
        if (!location) {
            throw AppError.notFound('Location non trovata');
        }

        // Solo gli admin possono eliminare locations
        if (currentUser.role !== 'admin') {
            throw AppError.forbidden('Solo gli amministratori possono eliminare locations');
        }

        return await Location.delete(locationId);
    }

    /**
     * Ottieni una location per ID con controlli di accesso
     * @param {number} locationId - ID della location
     * @param {Object} currentUser - Utente che fa la richiesta (opzionale)
     * @returns {Promise<Location>} - Location trovata
     */
    static async getLocationById(locationId, currentUser = null) {
        const location = await Location.findById(locationId);
        if (!location) {
            throw AppError.notFound('Location non trovata');
        }

        // Se c'è un utente, verifica i permessi
        if (currentUser) {
            // Manager possono vedere solo le loro location
            if (currentUser.role === 'manager' && location.manager_id !== currentUser.user_id) {
                throw AppError.forbidden('Non hai i permessi per visualizzare questa location');
            }
        }

        return location;
    }

    /**
     * Ottieni locations filtrate in base ai permessi dell'utente
     * @param {Object} filters - Filtri di ricerca
     * @param {Object} currentUser - Utente che fa la richiesta (può essere null per richieste pubbliche)
     * @returns {Promise<Location[]>} - Array di locations
     */
    static async getLocations(filters, currentUser = null) {
        // I manager possono vedere solo le loro locations
        if (currentUser && currentUser.role === 'manager') {
            filters.manager_id = currentUser.user_id;
        }

        return await Location.findAll(filters);
    }

    /**
     
Ottieni tutte le locations gestite da un manager specifico
@param {number} managerId - ID del manager
@returns {Promise<Location[]>} - Array di locations gestite dal manager*/
static async getLocationsByManager(managerId) {
    if (!managerId) {
        throw AppError.badRequest('ID manager richiesto');}

        // Verifica che l'utente esista e sia un manager
        const manager = await User.findById(managerId);
        if (!manager) {
            throw AppError.notFound('Manager non trovato');
        }

        if (!['manager', 'admin'].includes(manager.role)) {
            throw AppError.badRequest('L\'utente specificato non ha il ruolo di manager');
        }

        const locations = await Location.findByManager(managerId);

        // Ritorna le locations con formato JSON
        return locations.map(location => location.toJSON());
    }

    /**
     * Ottieni locations con tipi di spazio associati e supporto per ordinamento avanzato
     * @param {Object} filters - Filtri di ricerca
     * @param {Object} sorting - Opzioni di ordinamento (sortBy, sortOrder)
     * @param {Object} currentUser - Utente che fa la richiesta (può essere null per richieste pubbliche)
     * @returns {Promise<Object[]>} - Array di locations con tipi di spazio
     */
    static async getLocationsWithSpaceTypes(filters, sorting = {}, currentUser = null) {
        // I manager possono vedere solo le loro locations
        if (currentUser && currentUser.role === 'manager') {
            filters.manager_id = currentUser.user_id;
        }

        const { sortBy = 'name', sortOrder = 'asc' } = sorting;

        // Validazione parametri di ordinamento
        const validSortFields = ['name', 'city', 'spaceType'];
        const validSortOrders = ['asc', 'desc'];

        if (!validSortFields.includes(sortBy)) {
            throw AppError.badRequest(`Campo di ordinamento non valido. Usa: ${validSortFields.join(', ')}`);
        }

        if (!validSortOrders.includes(sortOrder)) {
            throw AppError.badRequest(`Ordine non valido. Usa: ${validSortOrders.join(', ')}`);
        }

        // Usa il metodo ottimizzato del modello che fa una singola query
        return await Location.findAllWithSpaceTypes(filters, sortBy, sortOrder);
    }

    /**
     * Ottieni dettagli completi di una location
     * @param {number} locationId - ID della location
     * @param {Object} currentUser - Utente che fa la richiesta (può essere null per richieste pubbliche)
     * @returns {Promise<Object>} - Location con statistiche
     */
    static async getLocationDetails(locationId, currentUser = null) {
        const location = await Location.findById(locationId);
        if (!location) {
            throw AppError.notFound('Location non trovata');
        }

        // I manager possono vedere solo le loro locations
        if (currentUser && currentUser.role === 'manager' && location.manager_id !== currentUser.user_id) {
            throw AppError.forbidden('Non hai accesso a questa location');
        }

        // Ottieni statistiche
        const stats = await Location.getStats(locationId);

        return {
            location: location.toJSON(),
            statistics: stats
        };
    }

    /**
     * Cerca locations disponibili per prenotazione
     * @param {Object} searchCriteria - Criteri di ricerca
     * @returns {Promise<Location[]>} - Locations disponibili
     */
    static async searchAvailableLocations(searchCriteria) {
        const { city, startDate, endDate, capacity, spaceType } = searchCriteria;

        // Query base per locations
        let query = `
            SELECT DISTINCT l.*, 
                   COUNT(s.space_id) as available_spaces,
                   MIN(s.price_per_hour) as min_price
            FROM locations l
            JOIN spaces s ON l.location_id = s.location_id
        `;

        const conditions = [];
        const values = [];
        let paramCount = 1;

        // Filtro città
        if (city) {
            conditions.push(`LOWER(l.city) = LOWER($${paramCount})`);
            values.push(city);
            paramCount++;
        }

        // Filtro capacità
        if (capacity) {
            conditions.push(`s.capacity >= $${paramCount}`);
            values.push(capacity);
            paramCount++;
        }

        // Filtro tipo spazio
        if (spaceType) {
            query += ` JOIN space_types st ON s.space_type_id = st.space_type_id`;
            conditions.push(`LOWER(st.type_name) = LOWER($${paramCount})`);
            values.push(spaceType);
            paramCount++;
        }

        // Filtro disponibilità temporale per prenotazioni giornaliere
        if (startDate && endDate) {
            conditions.push(`
                NOT EXISTS (
                    SELECT 1 FROM bookings b 
                    WHERE b.space_id = s.space_id 
                    AND b.status IN ('confirmed', 'pending')
                    AND (
                        (b.start_date <= $${paramCount + 1} AND b.end_date >= $${paramCount}) OR
                        (b.start_date <= $${paramCount} AND b.end_date >= $${paramCount}) OR
                        (b.start_date <= $${paramCount + 1} AND b.end_date >= $${paramCount + 1})
                    )
                )
            `);
            values.push(startDate, endDate);
            paramCount += 2;
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += `
            GROUP BY l.location_id, l.location_name, l.address, l.city, l.description, l.manager_id
            HAVING COUNT(s.space_id) > 0
            ORDER BY l.city, l.location_name
        `;

        const db = require('../config/db');
        const result = await db.query(query, values);

        return result.rows.map(row => ({
            ...new Location(row).toJSON(),
            availableSpaces: parseInt(row.available_spaces),
            minPrice: parseFloat(row.min_price)
        }));
    }

    /**
     * Trasferisci gestione di una location a un altro manager
     * @param {number} locationId - ID della location
     * @param {number} newManagerId - ID del nuovo manager
     * @param {Object} currentUser - Utente che fa la richiesta
     * @returns {Promise<Location>} - Location aggiornata
     */
    static async transferLocation(locationId, newManagerId, currentUser) {
        // Solo admin può trasferire locations
        if (currentUser.role !== 'admin') {
            throw AppError.forbidden('Solo gli amministratori possono trasferire locations');
        }

        const location = await Location.findById(locationId);
        if (!location) {
            throw AppError.notFound('Location non trovata');
        }

        const newManager = await User.findById(newManagerId);
        if (!newManager) {
            throw AppError.badRequest('Nuovo manager non trovato');
        }

        if (!['manager', 'admin'].includes(newManager.role)) {
            throw AppError.badRequest('L\'utente deve avere il ruolo di manager o admin');
        }

        return await Location.update(locationId, { manager_id: newManagerId });
    }

    /**
     * Verifica se un utente può gestire una location
     * @param {Location} location - Location da verificare
     * @param {Object} user - Utente da verificare
     * @returns {boolean} - true se può gestire
     */
    static canManageLocation(location, user) {
        // Admin può gestire tutte le locations
        if (user.role === 'admin') {
            return true;
        }

        // Manager può gestire solo le sue locations
        if (user.role === 'manager' && location.manager_id === user.user_id) {
            return true;
        }

        return false;
    }

    /**
     * Ottieni locations filtrate con ordinamento avanzato
     * @param {Object} filters - Filtri di ricerca (name, city, manager_id)
     * @param {Object} sorting - Opzioni di ordinamento (sortBy, sortOrder)
     * @param {Object} currentUser - Utente che fa la richiesta (può essere null per richieste pubbliche)
     * @returns {Promise<Location[]>} - Array di locations filtrate e ordinate
     */
    static async getFilteredLocations(filters, sorting = {}, currentUser = null) {
        // I manager possono vedere solo le loro locations
        if (currentUser && currentUser.role === 'manager') {
            filters.manager_id = currentUser.user_id;
        }

        const { sortBy = 'name', sortOrder = 'asc' } = sorting;

        // Validazione parametri di ordinamento
        const validSortFields = ['name', 'city', 'date'];
        const validSortOrders = ['asc', 'desc'];

        if (!validSortFields.includes(sortBy)) {
            throw AppError.badRequest(`Campo di ordinamento non valido. Usa: ${validSortFields.join(', ')}`);
        }

        if (!validSortOrders.includes(sortOrder)) {
            throw AppError.badRequest(`Ordine non valido. Usa: ${validSortOrders.join(', ')}`);
        }

        return await Location.findAllWithSorting(filters, sortBy, sortOrder);
    }

    /**
     * Ottieni informazioni complete di una location con tutti i dati associati
     * @param {number} locationId - ID della location
     * @param {Object} currentUser - Utente che fa la richiesta (può essere null per richieste pubbliche)
     * @returns {Promise<Object>} - Informazioni complete della location
     */
    static async getLocationCompleteInfo(locationId, currentUser = null) {
        const location = await Location.findById(locationId);
        if (!location) {
            throw AppError.notFound('Location non trovata');
        }

        // I manager possono vedere solo le loro locations (controllo di sicurezza)
        if (currentUser && currentUser.role === 'manager' && location.manager_id !== currentUser.user_id) {
            throw AppError.forbidden('Non hai accesso a questa location');
        }

        // Recupera tutte le informazioni associate
        const [
            spaces,
            statistics,
            recentBookings,
            spaceTypes
        ] = await Promise.all([
            Location.getLocationSpaces(locationId),
            Location.getLocationStatistics(locationId),
            Location.getLocationRecentBookings(locationId),
            Location.getLocationSpaceTypes(locationId)
        ]);

        // TODO: Implement getLocationAvailableServices when services functionality is added
        const availableServices = [];

        return {
            location: location.toJSON(),
            spaces,
            statistics,
            recentBookings,
            spaceTypes,
            availableServices,
            summary: {
                totalSpaces: spaces.length,
                totalSpaceTypes: spaceTypes.length,
                totalServices: availableServices.length,
                ...statistics
            }
        };
    }

    /**
     * Ottieni locations filtrate con ordinamento avanzato
     * @param {Object} filters - Filtri di ricerca (name, city, manager_id)
     * @param {Object} sorting - Opzioni di ordinamento (sortBy, sortOrder)
     * @param {Object} currentUser - Utente che fa la richiesta (può essere null per richieste pubbliche)
     * @returns {Promise<Location[]>} - Array di locations filtrate e ordinate
     */
    static async getFilteredLocations(filters, sorting = {}, currentUser = null) {
        // I manager possono vedere solo le loro locations
        if (currentUser && currentUser.role === 'manager') {
            filters.manager_id = currentUser.user_id;
        }

        const { sortBy = 'name', sortOrder = 'asc' } = sorting;

        // Validazione parametri di ordinamento
        const validSortFields = ['name', 'city', 'date'];
        const validSortOrders = ['asc', 'desc'];

        if (!validSortFields.includes(sortBy)) {
            throw AppError.badRequest(`Campo di ordinamento non valido. Usa: ${validSortFields.join(', ')}`);
        }

        if (!validSortOrders.includes(sortOrder)) {
            throw AppError.badRequest(`Ordine non valido. Usa: ${validSortOrders.join(', ')}`);
        }

        return await Location.findAllWithSorting(filters, sortBy, sortOrder);
    }

    /**
     * Ottieni informazioni complete di una location con tutti i dati associati
     * @param {number} locationId - ID della location
     * @param {Object} currentUser - Utente che fa la richiesta (può essere null per richieste pubbliche)
     * @returns {Promise<Object>} - Informazioni complete della location
     */
    static async getLocationCompleteInfo(locationId, currentUser = null) {
        const location = await Location.findById(locationId);
        if (!location) {
            throw AppError.notFound('Location non trovata');
        }

        // I manager possono vedere solo le loro locations (controllo di sicurezza)
        if (currentUser && currentUser.role === 'manager' && location.manager_id !== currentUser.user_id) {
            throw AppError.forbidden('Non hai accesso a questa location');
        }

        // Recupera tutte le informazioni associate
        const [
            spaces,
            statistics,
            recentBookings,
            spaceTypes,
            availableServices
        ] = await Promise.all([
            Location.getLocationSpaces(locationId),
            Location.getLocationStatistics(locationId),
            Location.getLocationRecentBookings(locationId),
            Location.getLocationSpaceTypes(locationId),
            Location.getLocationAvailableServices(locationId)
        ]);

        return {
            location: location.toJSON(),
            spaces,
            statistics,
            recentBookings,
            spaceTypes,
            availableServices,
            summary: {
                totalSpaces: spaces.length,
                totalSpaceTypes: spaceTypes.length,
                totalServices: availableServices.length,
                ...statistics
            }
        };
    }
}

module.exports = LocationService;
