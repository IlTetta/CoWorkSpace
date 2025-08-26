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
            this.baseURL = 'http://localhost:3000/api';
            this.defaultHeaders = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
        }

        // Metodo privato per gestire le chiamate HTTP
        async #makeRequest(endpoint, options = {}) {
            const url = `${this.baseURL}${endpoint}`;
            
            const config = {
                headers: { ...this.defaultHeaders, ...options.headers },
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

        async getLocationById(id) {
            const data = await this.get(`/locations/${id}`);
            return data.data;
        }

        async createLocation(locationData) {
            const data = await this.post('/locations', locationData);
            return data.data;
        }

        async updateLocation(id, locationData) {
            const data = await this.put(`/locations/${id}`, locationData);
            return data.data;
        }

        async deleteLocation(id) {
            return this.delete(`/locations/${id}`);
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
                
                const data = await this.get('/spaces', cleanFilters);
                // Il backend restituisce data.items per le liste
                return Array.isArray(data.data.items) ? data.data.items : [];
            } catch (error) {
                console.error('Error in getAllSpaces:', error);
                return []; // Sempre restituisci un array
            }
        }

        async getSpaceById(id) {
            const data = await this.get(`/spaces/${id}`);
            return data.data.space;
        }

        async createSpace(spaceData) {
            const data = await this.post('/spaces', spaceData);
            return data.data;
        }

        async updateSpace(id, spaceData) {
            const data = await this.put(`/spaces/${id}`, spaceData);
            return data.data;
        }

        async deleteSpace(id) {
            return this.delete(`/spaces/${id}`);
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
    }

    // Crea un'istanza globale del servizio API
    const apiServiceInstance = new ApiService();
    
    // Esporta per l'uso globale
    window.apiService = apiServiceInstance;
    window.ApiService = ApiService;

    console.log('[API] ApiService loaded and available globally');

})();
