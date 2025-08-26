// Funzione per ottenere tutte le locations, opzionalmente filtrate per città
async function getAllLocations(city = null) {
    localStorage.removeItem(1);
    try {
        // Controlla se apiService è disponibile
        if (!window.apiService) {
            console.error('ApiService not available yet');
            throw new Error('ApiService non ancora disponibile');
        }

        const filters = city ? { city } : {};
        const locations = await window.apiService.getAllLocations(filters);
        
        // Controllo sicurezza: assicurati che locations sia un array
        if (!Array.isArray(locations)) {
            console.error('Invalid locations data:', locations);
            return []; // Restituisci array vuoto invece di undefined
        }
        
        console.log('Locations trovate:', locations.length);
        return locations;
    } catch (error) {
        console.error('Errore nel recupero delle locations:', error);
        return []; // Restituisci array vuoto in caso di errore
    }
}

// Funzione per ottenere i tipi di spazi di una location
async function getLocationSpaceTypes(locationId) {
    try {
        // Validazione: controlla che locationId sia valido
        if (!locationId || locationId === 'undefined') {
            console.warn('LocationId non valido:', locationId);
            return 'Spazio generico';
        }

        // Controlla se apiService è disponibile
        if (!window.apiService) {
            console.warn('ApiService not available for space types');
            return 'Spazio generico';
        }

        const spaces = await window.apiService.getAllSpaces({ location_id: locationId });
        
        // Controllo sicurezza
        if (!Array.isArray(spaces) || spaces.length === 0) {
            console.log(`Nessun spazio configurato per location ${locationId}`);
            return 'Spazio non configurato';
        }
        
        // Estrae i tipi di spazi - gestisce la struttura del backend attuale
        const spaceTypes = spaces.map(space => {
            // Il tipo potrebbe essere in diversi campi
            return space.spaceType?.name || // Backend attuale: spaceType.name
                   space.type_name ||       // Formato alternativo
                   space.typeName ||        // CamelCase
                   space.space_type ||      // Snake_case
                   space.type ||            // Campo semplice
                   'Tipo sconosciuto';
        }).filter(type => type && type !== 'Tipo sconosciuto');
        
        if (spaceTypes.length === 0) {
            return 'Spazio generico';
        }
        
        const typeCount = {};
        
        spaceTypes.forEach(type => {
            typeCount[type] = (typeCount[type] || 0) + 1;
        });
        
        // Trova il tipo più comune
        const mostCommonType = Object.keys(typeCount).reduce((a, b) => 
            typeCount[a] > typeCount[b] ? a : b, 'Spazio generico'
        );
        
        return mostCommonType;
    } catch (error) {
        console.error('Errore nel recupero dei tipi di spazi per location', locationId, ':', error);
        return 'Spazio generico';
    }
}

// Funzione per generare un colore pastello casuale usando HSL
function getRandomPastelColor() {
    const hue = Math.floor(Math.random() * 360); // Hue da 0 a 359
    return `hsl(${hue}, 65%, 85%)`;  // Saturazione e luminosità ottimizzate per pastelli
}

// Funzione per renderizzare la griglia delle locations
async function renderGrid(locations) {
    const gridContainer = document.querySelector('.grid-container');
    
    if (!gridContainer) {
        console.error('Grid container non trovato!');
        return;
    }

    // Mostra un messaggio di caricamento
    gridContainer.innerHTML = '<div class="loading">Caricamento in corso...</div>';

    try {
        // Generate the HTML for each location
        let locationsHtml = '';
        
        // Processa le locations in parallelo per ottimizzare le performance
        const locationPromises = locations.map(async (location) => {
            // Gestisci entrambi i formati: backend potrebbe restituire 'id' o 'location_id', 'name' o 'location_name'
            const location_id = location.location_id || location.id;
            const location_name = location.location_name || location.name;
            const { city, address } = location;
            
            const randomColor = getRandomPastelColor();
            
            // Ottieni il tipo di location principale
            const locationType = await getLocationSpaceTypes(location_id);
            
            return `
                <div class="location-card" data-location-id="${location_id || 'unknown'}">
                    <div class="location-name" style="--random-color: ${randomColor}">${location_name || 'Nome sconosciuto'}</div>
                    <div class="location-type">${locationType}</div>
                    <div class="location-city">${city || 'Città sconosciuta'}</div>
                    <div class="location-address">${address || 'Indirizzo sconosciuto'}</div>
                </div>
            `;
        });

        // Attendi che tutte le promise si risolvano
        const locationCards = await Promise.all(locationPromises);
        locationsHtml = locationCards.join('');

        // Insert the generated HTML into the page
        gridContainer.innerHTML = locationsHtml;
        
        console.log(`Renderizzate ${locations.length} locations`);
    } catch (error) {
        console.error('Errore durante il rendering della griglia:', error);
        gridContainer.innerHTML = '<div class="error">Errore nel caricamento delle locations</div>';
    }
}

// Funzione principale per visualizzare le locations
async function displayLocations() {
    try {
        console.log('Inizio caricamento locations...');
        
        // Aspetta che apiService sia disponibile
        let retries = 0;
        const maxRetries = 50; // 5 secondi max di attesa
        
        while (!window.apiService && retries < maxRetries) {
            console.log('Waiting for apiService...', retries);
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        if (!window.apiService) {
            console.error('ApiService not available after waiting');
            const gridContainer = document.querySelector('.grid-container');
            if (gridContainer) {
                gridContainer.innerHTML = '<div class="error">Servizio API non disponibile</div>';
            }
            return;
        }
        
        const locations = await getAllLocations();
        
        if (locations && locations.length > 0) {
            await renderGrid(locations);
        } else {
            const gridContainer = document.querySelector('.grid-container');
            if (gridContainer) {
                gridContainer.innerHTML = '<div class="no-locations">Nessuna location trovata</div>';
            }
        }
    } catch (error) {
        console.error('Errore durante il recupero delle locations:', error);
        const gridContainer = document.querySelector('.grid-container');
        if (gridContainer) {
            gridContainer.innerHTML = '<div class="error">Errore nel caricamento delle locations</div>';
        }
    }
}

// Funzione per cercare locations per città
async function searchLocationsByCity(city) {
    try {
        console.log(`Ricerca locations per città: ${city}`);
        const locations = await getAllLocations(city);
        await renderGrid(locations);
    } catch (error) {
        console.error('Errore nella ricerca per città:', error);
    }
}

// Inizializzazione sicura quando il DOM è pronto
(function() {
    'use strict';

    function initializeGrid() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', displayLocations);
        } else {
            // DOM già caricato, avvia con un piccolo delay per assicurarsi che tutti i servizi siano pronti
            setTimeout(displayLocations, 100);
        }
    }

    // Inizializza
    initializeGrid();

    // Esporta funzioni al global scope per compatibilità
    window.renderGrid = renderGrid;
    window.getAllLocations = getAllLocations;
    window.searchLocationsByCity = searchLocationsByCity;
    window.displayLocations = displayLocations;

})();

