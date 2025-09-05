// Optimized Location Service per ridurre le query
(function() {
    'use strict';
    
    // Evita duplicazioni
    if (window.optimizedLocationService) {
        console.warn('OptimizedLocationService already loaded');
        return;
    }

    class OptimizedLocationService {
        constructor() {
            this.apiService = window.apiService;
            this.cacheService = window.cacheService;
            this.locationSpaceTypesCache = new Map();
        }

        // Ottieni locations con space types in una sola query ottimizzata
        async getLocationsWithSpaceTypes(filters = {}) {
            try {
                console.log('[OptimizedLocationService] Getting locations with space types...');
                
                // 1. Ottieni tutte le locations (con cache)
                const locations = await this.apiService.getAllLocations(filters);
                
                if (!Array.isArray(locations) || locations.length === 0) {
                    return [];
                }

                // 2. Ottieni tutti gli spazi in una singola query (senza filtro location_id)
                const allSpaces = await this.apiService.getAllSpaces();
                
                // 3. Raggruppa spazi per location_id
                const spacesByLocation = {};
                allSpaces.forEach(space => {
                    const locationId = space.location_id;
                    if (!spacesByLocation[locationId]) {
                        spacesByLocation[locationId] = [];
                    }
                    spacesByLocation[locationId].push(space);
                });

                // 4. Elabora locations con i loro space types
                const locationsWithTypes = locations.map(location => {
                    const locationId = location.location_id || location.id;
                    const locationSpaces = spacesByLocation[locationId] || [];
                    
                    // Calcola il tipo più comune
                    const spaceType = this.calculateMostCommonSpaceType(locationSpaces);
                    
                    return {
                        ...location,
                        primarySpaceType: spaceType,
                        spacesCount: locationSpaces.length,
                        availableSpaceTypes: this.getUniqueSpaceTypes(locationSpaces)
                    };
                });

                console.log(`[OptimizedLocationService] ✓ Processed ${locationsWithTypes.length} locations with space types`);
                return locationsWithTypes;

            } catch (error) {
                console.error('[OptimizedLocationService] Error:', error);
                return [];
            }
        }

        // Calcola il tipo di spazio più comune per una location
        calculateMostCommonSpaceType(spaces) {
            if (!Array.isArray(spaces) || spaces.length === 0) {
                console.log('[OptimizedLocationService] No spaces found, using default type');
                return 'Spazio di lavoro';
            }

            // Debug: mostra struttura primo spazio
            if (spaces.length > 0) {
                console.log('[OptimizedLocationService] First space structure:', {
                    id: spaces[0].id || spaces[0].space_id,
                    spaceType: spaces[0].spaceType,
                    space_type: spaces[0].space_type,
                    type_name: spaces[0].type_name,
                    typeName: spaces[0].typeName,
                    keys: Object.keys(spaces[0])
                });
            }

            // Conta occorrenze di ogni tipo
            const typeCount = {};
            spaces.forEach(space => {
                const typeName = space.spaceType?.name ||     // Oggetto spaceType dal backend
                               space.space_type?.name ||    // Oggetto space_type dal backend  
                               space.type_name ||           // Campo diretto type_name
                               space.typeName ||            // CamelCase
                               space.space_type ||          // Snake_case come stringa
                               space.type ||                // Campo semplice
                               null;
                
                console.log('[OptimizedLocationService] Extracted type name:', typeName, 'from space:', space.id || space.space_id);
                
                if (typeName && typeName !== 'Tipo sconosciuto') {
                    typeCount[typeName] = (typeCount[typeName] || 0) + 1;
                }
            });

            console.log('[OptimizedLocationService] Type count:', typeCount);

            // Se nessun tipo valido trovato
            if (Object.keys(typeCount).length === 0) {
                console.log('[OptimizedLocationService] No valid types found, using default');
                return 'Spazio di lavoro';
            }

            // Trova il tipo più comune
            const mostCommonType = Object.keys(typeCount).reduce((a, b) => 
                typeCount[a] > typeCount[b] ? a : b
            );

            console.log('[OptimizedLocationService] Most common type:', mostCommonType);
            return mostCommonType;
        }

        // Ottieni tutti i tipi di spazio unici per una location
        getUniqueSpaceTypes(spaces) {
            if (!Array.isArray(spaces)) return [];

            const uniqueTypes = new Set();
            spaces.forEach(space => {
                const typeName = space.spaceType?.name ||     // Oggetto spaceType dal backend
                               space.space_type?.name ||    // Oggetto space_type dal backend  
                               space.type_name ||           // Campo diretto type_name
                               space.typeName ||            // CamelCase
                               space.space_type ||          // Snake_case come stringa
                               space.type ||                // Campo semplice
                               null;
                
                if (typeName) {
                    uniqueTypes.add(typeName);
                }
            });

            return Array.from(uniqueTypes);
        }

        // Ottieni location con dettagli completi includendo spazi e prenotazioni
        async getLocationWithFullDetails(locationId) {
            try {
                console.log(`[OptimizedLocationService] Getting full details for location ${locationId}`);
                
                // Esegui tutte le query in parallelo
                const [locationDetails, spaces, spaceTypes] = await Promise.all([
                    this.apiService.getLocationById(locationId),
                    this.apiService.getAllSpaces({ location_id: locationId }),
                    this.apiService.getAllSpaceTypes()
                ]);

                // Mappa space types per ID per lookup veloce
                const spaceTypesMap = {};
                spaceTypes.forEach(type => {
                    spaceTypesMap[type.space_type_id] = type;
                });

                // Arricchisci spazi con informazioni sui tipi
                const enrichedSpaces = spaces.map(space => ({
                    ...space,
                    spaceTypeDetails: spaceTypesMap[space.space_type_id] || null
                }));

                const fullDetails = {
                    ...locationDetails,
                    spaces: enrichedSpaces,
                    spacesCount: enrichedSpaces.length,
                    availableSpaceTypes: this.getUniqueSpaceTypes(enrichedSpaces),
                    primarySpaceType: this.calculateMostCommonSpaceType(enrichedSpaces)
                };

                console.log(`[OptimizedLocationService] ✓ Full details loaded for location ${locationId}`);
                return fullDetails;

            } catch (error) {
                console.error(`[OptimizedLocationService] Error getting details for location ${locationId}:`, error);
                throw error;
            }
        }

        // Cerca locations con filtri avanzati - ottimizzato
        async searchLocationsOptimized(searchQuery = '', filters = {}) {
            try {
                console.log('[OptimizedLocationService] Performing optimized search...');
                
                // Ottieni tutte le locations con space types
                const locationsWithTypes = await this.getLocationsWithSpaceTypes(filters);
                
                if (!searchQuery.trim()) {
                    return locationsWithTypes;
                }

                // Filtro locale ottimizzato
                const normalizedQuery = searchQuery.toLowerCase().trim();
                
                const filteredLocations = locationsWithTypes.filter(location => {
                    const locationName = (location.location_name || location.name || '').toLowerCase();
                    const city = (location.city || '').toLowerCase();
                    const address = (location.address || '').toLowerCase();
                    const spaceType = (location.primarySpaceType || '').toLowerCase();
                    
                    // Multi-field search con word matching
                    return locationName.includes(normalizedQuery) ||
                           city.includes(normalizedQuery) ||
                           address.includes(normalizedQuery) ||
                           spaceType.includes(normalizedQuery) ||
                           locationName.split(' ').some(word => word.includes(normalizedQuery)) ||
                           city.split(' ').some(word => word.includes(normalizedQuery)) ||
                           location.availableSpaceTypes.some(type => 
                               type.toLowerCase().includes(normalizedQuery)
                           );
                });

                console.log(`[OptimizedLocationService] ✓ Search completed: ${filteredLocations.length} results`);
                return filteredLocations;

            } catch (error) {
                console.error('[OptimizedLocationService] Search error:', error);
                return [];
            }
        }

        // Invalida cache quando dati cambiano
        invalidateLocationCache() {
            if (this.cacheService) {
                this.cacheService.invalidatePattern('getAllLocations');
                this.cacheService.invalidatePattern('getAllSpaces');
            }
            this.locationSpaceTypesCache.clear();
            console.log('[OptimizedLocationService] Cache invalidated');
        }

        // Statistiche performance
        getPerformanceStats() {
            return {
                cacheStats: this.cacheService ? this.cacheService.getStats() : null,
                localCacheSize: this.locationSpaceTypesCache.size
            };
        }
    }

    // Attendi che i servizi dipendenti siano disponibili
    function initializeOptimizedLocationService() {
        console.log('[OptimizedLocationService] Checking dependencies - apiService:', !!window.apiService, 'cacheService:', !!window.cacheService);
        
        if (window.apiService) {
            const optimizedLocationServiceInstance = new OptimizedLocationService();
            window.optimizedLocationService = optimizedLocationServiceInstance;
            console.log('[OptimizedLocationService] ✓ Service loaded and available globally');
            
            // Test immediato per vedere se funziona
            setTimeout(() => {
                console.log('[OptimizedLocationService] Running initialization test...');
                optimizedLocationServiceInstance.getLocationsWithSpaceTypes()
                    .then(locations => {
                        console.log('[OptimizedLocationService] ✓ Initialization test successful:', locations.length, 'locations');
                    })
                    .catch(error => {
                        console.error('[OptimizedLocationService] ✗ Initialization test failed:', error);
                    });
            }, 1000);
        } else {
            console.log('[OptimizedLocationService] ApiService not ready, retrying in 100ms...');
            // Riprova tra 100ms
            setTimeout(initializeOptimizedLocationService, 100);
        }
    }

    // Inizializza quando DOM è pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeOptimizedLocationService);
    } else {
        initializeOptimizedLocationService();
    }

})();
