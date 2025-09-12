// API Service per centralizzare le chiamate al backend
(function() {
    'use strict';
    
    // Evita duplicazioni
    if (window.apiService) {
        console.warn('ApiService already loaded');
        return;
    }

    class ApiService {
        constructor() {
            // Determina baseURL dinamicamente in base all'ambiente
            if (window.location.port === '5500' || window.location.hostname === '127.0.0.1') {
                // Live Server o sviluppo locale - usa sempre il server backend su porta 3000
                this.baseURL = 'http://localhost:3000/api';
            } else if (window.location.port === '3000') {
                // Servito dal backend Express - usa path relativo
                this.baseURL = '/api';
            } else {
                // Default: assumi server backend su localhost:3000
                this.baseURL = 'http://localhost:3000/api';
            }
            
            this.defaultHeaders = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
        }

        // Metodo privato per ottenere headers con autenticazione
        #getHeaders(additionalHeaders = {}) {
            const baseHeaders = { ...this.defaultHeaders, ...additionalHeaders };
            
            // Aggiungi token di autenticazione se presente
            const token = localStorage.getItem('coworkspace_token');
            if (token) {
                baseHeaders['Authorization'] = `Bearer ${token}`;
                console.log('[API] Including auth token in request');
            } else {
                console.log('[API] No auth token found');
            }
            
            return baseHeaders;
        }

        // Metodo privato per gestire le chiamate HTTP
        async #makeRequest(endpoint, options = {}) {
            const url = `${this.baseURL}${endpoint}`;
            
            const config = {
                headers: this.#getHeaders(options.headers),
                ...options
            };

            try {
                console.log(`[API] ${config.method || 'GET'} ${url}`);
                const response = await fetch(url, config);

                // Check if response is ok
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                // Check API response format - il backend usa 'success: true' e 'status: success'
                if (!data.success || data.status !== 'success') {
                    throw new Error(data.message || 'API returned error status');
                }

                console.log(`[API] ✓ Success for ${url}`);
                return data;

            } catch (error) {
                console.error(`[API] ✗ Error for ${url}:`, error.message);
                throw error;
            }
        }

        // GET request
        async get(endpoint, params = {}) {
            let url = endpoint;
            
            // Add query parameters if provided
            if (Object.keys(params).length > 0) {
                const queryString = new URLSearchParams(params).toString();
                url += `?${queryString}`;
            }

            return this.#makeRequest(url, { method: 'GET' });
        }

        // POST request
        async post(endpoint, data = {}) {
            return this.#makeRequest(endpoint, {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }

        // PUT request
        async put(endpoint, data = {}) {
            return this.#makeRequest(endpoint, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        }

        // DELETE request
        async delete(endpoint) {
            return this.#makeRequest(endpoint, { method: 'DELETE' });
        }

        // Health check
        async healthCheck() {
            try {
                const response = await fetch(`${this.baseURL.replace('/api', '/health')}`);
                return await response.json();
            } catch (error) {
                console.error('[API] Health check failed:', error);
                throw error;
            }
        }

        // Get API information
        async getApiInfo() {
            try {
                const response = await fetch(this.baseURL);
                return await response.json();
            } catch (error) {
                console.error('[API] API info failed:', error);
                throw error;
            }
        }

        // --- LOCATIONS ---
        async getAllLocations(filters = {}) {
            try {
                // Filtra parametri undefined/null/vuoti prima di inviarli
                const cleanFilters = Object.keys(filters).reduce((acc, key) => {
                    const value = filters[key];
                    if (value !== undefined && value !== null && value !== '') {
                        acc[key] = value;
                    }
                    return acc;
                }, {});
                
                const data = await this.get('/locations', cleanFilters);
                // Il backend restituisce data.items per le liste
                return Array.isArray(data.data.items) ? data.data.items : [];
            } catch (error) {
                console.error('Error in getAllLocations:', error);
                return []; // Sempre restituisci un array
            }
        }

        // --- MANAGER LOCATIONS ---
        async getMyLocations(filters = {}) {
            try {
                const cleanFilters = Object.keys(filters).reduce((acc, key) => {
                    const value = filters[key];
                    if (value !== undefined && value !== null && value !== '') {
                        acc[key] = value;
                    }
                    return acc;
                }, {});
                
                const data = await this.get('/manager/locations', cleanFilters);
                return Array.isArray(data.data.items) ? data.data.items : Array.isArray(data.data) ? data.data : [];
            } catch (error) {
                console.error('Error in getMyLocations:', error);
                return [];
            }
        }

        async createLocation(locationData) {
            const data = await this.post('/manager/locations', locationData);
            return data.data;
        }

        async updateLocation(id, locationData) {
            const data = await this.put(`/manager/locations/${id}`, locationData);
            return data.data;
        }

        async deleteLocation(id) {
            return this.delete(`/manager/locations/${id}`);
        }

        async getLocationById(id) {
            try {
                // Try complete endpoint first
                const data = await this.get(`/locations/${id}/complete`);
                return data.data;
            } catch (error) {
                console.warn('Complete endpoint failed, trying basic endpoint:', error.message);
                try {
                    // Fallback to basic endpoint
                    const data = await this.get(`/locations/${id}`);
                    return data.data;
                } catch (fallbackError) {
                    console.error('Error getting location by id (both endpoints failed):', fallbackError);
                    throw fallbackError;
                }
            }
        }

        // Ottieni locations ordinate alfabeticamente
        async getLocationsAlphabetical(order = 'asc', filters = {}) {
            try {
                const cleanFilters = Object.keys(filters).reduce((acc, key) => {
                    const value = filters[key];
                    if (value !== undefined && value !== null && value !== '') {
                        acc[key] = value;
                    }
                    return acc;
                }, {});

                // Usa l'endpoint alphabetical con il parametro corretto
                const data = await this.get('/locations/alphabetical', {
                    ...cleanFilters,
                    sortOrder: order
                });
                
                return Array.isArray(data.data.items) ? data.data.items : [];
            } catch (error) {
                console.error('Error in getLocationsAlphabetical:', error);
                return [];
            }
        }

        // Ottieni locations filtrate per tipo di spazio
        async getFilteredLocations(filters = {}, sortOptions = {}) {
            try {
                const params = {
                    ...filters,
                    sortBy: sortOptions.sortBy || 'name',
                    sortOrder: sortOptions.sortOrder || 'asc'
                };

                const cleanParams = Object.keys(params).reduce((acc, key) => {
                    const value = params[key];
                    if (value !== undefined && value !== null && value !== '') {
                        acc[key] = value;
                    }
                    return acc;
                }, {});

                const data = await this.get('/locations/filter', cleanParams);
                return Array.isArray(data.data.items) ? data.data.items : [];
            } catch (error) {
                console.error('Error in getFilteredLocations:', error);
                return [];
            }
        }

        // --- SPACES ---
        async getAllSpaces(filters = {}) {
            try {
                // Filtra parametri undefined/null/vuoti prima di inviarli
                const cleanFilters = Object.keys(filters).reduce((acc, key) => {
                    const value = filters[key];
                    if (value !== undefined && value !== null && value !== '') {
                        acc[key] = value;
                    }
                    return acc;
                }, {});
                
                const data = await this.get('/manager/spaces', cleanFilters);
                // Il backend restituisce data.items per le liste
                return Array.isArray(data.data.items) ? data.data.items : Array.isArray(data.data) ? data.data : [];
            } catch (error) {
                console.error('Error in getAllSpaces:', error);
                return []; // Sempre restituisci un array
            }
        }

        async getSpaceById(id) {
            // Use public endpoint for space details
            const data = await this.get(`/spaces/${id}`);
            return data.data.space || data.data;
        }

        async createSpace(spaceData) {
            const data = await this.post('/manager/spaces', spaceData);
            return data.data;
        }

        async updateSpace(id, spaceData) {
            const data = await this.put(`/manager/spaces/${id}`, spaceData);
            return data.data;
        }

        async deleteSpace(id) {
            return this.delete(`/manager/spaces/${id}`);
        }

        // --- SPACE TYPES ---
        async getAllSpaceTypes() {
            try {
                const data = await this.get('/space-types');
                return Array.isArray(data.data.items) ? data.data.items : [];
            } catch (error) {
                console.error('Error in getAllSpaceTypes:', error);
                return [];
            }
        }

        async getSpaceTypeById(id) {
            const data = await this.get(`/space-types/${id}`);
            return data.data.spaceType;
        }

        // --- USERS ---
        async getCurrentUser() {
            try {
                const data = await this.get('/users/profile');
                return data.data.user; // Il backend restituisce { data: { user: {...} } }
            } catch (error) {
                console.error('Error getting current user:', error);
                throw error;
            }
        }

        async getAllUsers() {
            try {
                const data = await this.get('/users');
                return Array.isArray(data.data.items) ? data.data.items : [];
            } catch (error) {
                console.error('Error in getAllUsers:', error);
                return [];
            }
        }

        async getUserById(id) {
            const data = await this.get(`/users/${id}`);
            return data.data;
        }

        async createUser(userData) {
            const data = await this.post('/users', userData);
            return data.data;
        }

        async loginUser(credentials) {
            const data = await this.post('/users/login', credentials);
            return data.data;
        }

        async registerUser(userData) {
            const data = await this.post('/users/register', userData);
            return data.data;
        }

        // --- BOOKINGS ---
        async getAllBookings(filters = {}) {
            try {
                // Filtra parametri undefined/null/vuoti prima di inviarli
                const cleanFilters = Object.keys(filters).reduce((acc, key) => {
                    const value = filters[key];
                    if (value !== undefined && value !== null && value !== '') {
                        acc[key] = value;
                    }
                    return acc;
                }, {});
                
                const data = await this.get('/bookings', cleanFilters);
                return Array.isArray(data.data.items) ? data.data.items : [];
            } catch (error) {
                console.error('Error in getAllBookings:', error);
                return [];
            }
        }

        async getBookingById(id) {
            const data = await this.get(`/bookings/${id}`);
            return data.data;
        }

        async createBooking(bookingData) {
            const data = await this.post('/bookings', bookingData);
            return data.data;
        }

        async updateBooking(id, bookingData) {
            const data = await this.put(`/bookings/${id}`, bookingData);
            return data.data;
        }

        async deleteBooking(id) {
            return this.delete(`/bookings/${id}`);
        }

        // Metodi per la gestione degli spazi
        async getSpacesByLocation(locationId) {
            try {
                // Use public endpoint with location filter
                const data = await this.get('/spaces', { locationId: locationId });
                const allSpaces = Array.isArray(data.data.items) ? data.data.items : [];
                
                return allSpaces;
            } catch (error) {
                console.error('Error getting spaces by location:', error);
                return [];
            }
        }

        async getSpaceTypesByLocation(locationId) {
            try {
                // Ottieni gli spazi per questa location e estrai i tipi unici
                const spaces = await this.getSpacesByLocation(locationId);
                
                // Crea una mappa dei tipi di spazio unici
                const spaceTypesMap = new Map();
                
                spaces.forEach(space => {
                    if (space.spaceType) {
                        const typeId = space.spaceType.id || space.spaceTypeId;
                        if (!spaceTypesMap.has(typeId)) {
                            spaceTypesMap.set(typeId, {
                                id: space.spaceType.id || space.spaceTypeId,
                                name: space.spaceType.name,
                                description: space.spaceType.description,
                                price: space.pricePerHour || space.price_per_hour
                            });
                        }
                    }
                });
                
                return Array.from(spaceTypesMap.values());
            } catch (error) {
                console.error('Error getting space types by location:', error);
                return [];
            }
        }

        async getSpaceById(spaceId) {
            try {
                // Use public endpoint for space details
                const data = await this.get(`/spaces/${spaceId}`);
                return data.data;
            } catch (error) {
                console.error('Error getting space by id:', error);
                throw error;
            }
        }

        // Calcola il prezzo della prenotazione
        async calculateBookingPrice(spaceId, date, time, duration, services = []) {
            try {
                const data = await this.post('/bookings/calculate-price', {
                    spaceId,
                    date,
                    time,
                    duration: parseInt(duration),
                    services
                });
                return data.data.totalPrice || 0;
            } catch (error) {
                console.error('Error calculating booking price:', error);
                return 0;
            }
        }

        // Metodo per creare una prenotazione
        async createBooking(bookingData) {
            try {
                const data = await this.post('/bookings', bookingData);
                return data.data;
            } catch (error) {
                console.error('Error creating booking:', error);
                throw error;
            }
        }
    }

    // Crea un'istanza globale del servizio API
    const apiServiceInstance = new ApiService();
    
    // Esporta per l'uso globale
    window.apiService = apiServiceInstance;
    window.ApiService = ApiService;

    console.log('[API] ApiService loaded and available globally');

})();
