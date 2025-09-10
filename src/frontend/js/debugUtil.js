// Debug utility per verificare la struttura dati del backend
(function() {
    'use strict';
    
    window.debugData = {
        // Test locations data
        async testLocations() {
            console.log('=== DEBUG: Testing Locations ===');
            try {
                if (!window.apiService) {
                    console.error('ApiService not available');
                    return;
                }
                
                const locations = await window.apiService.getAllLocations();
                console.log('Total locations:', locations.length);
                
                if (locations.length > 0) {
                    console.log('First location:', locations[0]);
                    console.log('Location keys:', Object.keys(locations[0]));
                    
                    // Test spazi per prima location
                    const firstLocationId = locations[0].location_id || locations[0].id;
                    console.log('Testing spaces for location:', firstLocationId);
                    
                    const spaces = await window.apiService.getAllSpaces({ location_id: firstLocationId });
                    console.log('Spaces for first location:', spaces);
                    console.log('Spaces count:', spaces.length);
                    
                    if (spaces.length > 0) {
                        console.log('First space:', spaces[0]);
                        console.log('Space keys:', Object.keys(spaces[0]));
                    }
                    
                    // Test tutti gli spazi
                    console.log('=== All Spaces Test ===');
                    const allSpaces = await window.apiService.getAllSpaces();
                    console.log('Total spaces in system:', allSpaces.length);
                    
                    if (allSpaces.length > 0) {
                        console.log('Sample spaces:', allSpaces.slice(0, 3));
                        
                        // Raggruppa per location
                        const spacesByLocation = {};
                        allSpaces.forEach(space => {
                            const locId = space.location_id;
                            if (!spacesByLocation[locId]) {
                                spacesByLocation[locId] = [];
                            }
                            spacesByLocation[locId].push(space);
                        });
                        
                        console.log('Spaces grouped by location:', spacesByLocation);
                    }
                }
                
            } catch (error) {
                console.error('Debug test error:', error);
            }
        },
        
        // Test space types
        async testSpaceTypes() {
            console.log('=== DEBUG: Testing Space Types ===');
            try {
                if (!window.apiService) {
                    console.error('ApiService not available');
                    return;
                }
                
                const spaceTypes = await window.apiService.getAllSpaceTypes();
                console.log('Total space types:', spaceTypes.length);
                console.log('Space types:', spaceTypes);
                
            } catch (error) {
                console.error('Space types test error:', error);
            }
        },
        
        // Test completo
        async runFullTest() {
            await this.testLocations();
            await this.testSpaceTypes();
            
            // Test servizio ottimizzato
            if (window.optimizedLocationService) {
                console.log('=== DEBUG: Testing Optimized Service ===');
                try {
                    const enrichedLocations = await window.optimizedLocationService.getLocationsWithSpaceTypes();
                    console.log('Optimized service locations:', enrichedLocations.length);
                    if (enrichedLocations.length > 0) {
                        console.log('First enriched location:', enrichedLocations[0]);
                    }
                } catch (error) {
                    console.error('Optimized service test error:', error);
                }
            }
        }
    };
    
    // Esporta anche una funzione di comodo
    window.testData = () => window.debugData.runFullTest();
    
    console.log('Debug utility loaded. Use window.testData() to run tests.');
    
})();
