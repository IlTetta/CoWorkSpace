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

// Funzione per estrarre i tipi di spazio dai dati della location (ora inclusi nella query)
function extractLocationTypes(location) {
    try {
        // Il backend ora include i tipi di spazio direttamente nella response
        const spaceTypes = location.space_types || location.spaceTypes || [];
        
        if (!Array.isArray(spaceTypes) || spaceTypes.length === 0) {
            console.log(`Nessun tipo di spazio configurato per location ${location.location_id || location.id}`);
            return 'Spazio non configurato';
        }
        
        // Estrae i nomi dei tipi di spazio
        const typeNames = spaceTypes.map(type => {
            return type.name || type.type_name || type.typeName || 'Tipo sconosciuto';
        }).filter(name => name && name !== 'Tipo sconosciuto');
        
        if (typeNames.length === 0) {
            return 'Spazio generico';
        }
        
        // Restituisci tutti i tipi di spazio separati da a capo
        // Ordina alfabeticamente per consistenza
        const sortedTypes = typeNames.sort();
        
        // Se ci sono più di 4 tipi, mostra i primi 3 e aggiungi "e altri X"
        if (sortedTypes.length > 4) {
            const remaining = sortedTypes.length - 3;
            return `${sortedTypes.slice(0, 3).join('<br>')}<br>e altri ${remaining}`;
        }
        
        // Altrimenti mostra tutti i tipi separati da a capo
        return sortedTypes.join('<br>');
    } catch (error) {
        console.error('Errore nell\'estrazione dei tipi di spazio:', error);
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
        
        // Processa le locations sincronamente (ora i tipi sono già inclusi)
        locations.forEach((location) => {
            // Gestisci entrambi i formati: backend potrebbe restituire 'id' o 'location_id', 'name' o 'location_name'
            const location_id = location.location_id || location.id;
            const location_name = location.location_name || location.name;
            const { city, address } = location;
            
            const randomColor = getRandomPastelColor();
            
            // Estrai il tipo di location dai dati già inclusi
            const locationType = extractLocationTypes(location);
            
            locationsHtml += `
                <div class="location-card" data-location-id="${location_id || 'unknown'}">
                    <div class="location-name" style="--random-color: ${randomColor}">${location_name || 'Nome sconosciuto'}</div>
                    <div class="location-type">${locationType}</div>
                    <div class="location-city">${city || 'Città sconosciuta'}</div>
                    <div class="location-address">${address || 'Indirizzo sconosciuto'}</div>
                </div>
            `;
        });

        // Insert the generated HTML into the page
        gridContainer.innerHTML = locationsHtml;
        
        // Aggiungi event listener per il click sulle card
        addLocationClickListeners();
        
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

// Funzione per aggiungere event listener alle location card
function addLocationClickListeners() {
    const locationCards = document.querySelectorAll('.location-card');
    console.log(`Adding click listeners to ${locationCards.length} location cards`); // Debug log
    
    locationCards.forEach(card => {
        card.addEventListener('click', function() {
            const locationId = this.getAttribute('data-location-id');
            console.log('Card clicked, location ID:', locationId); // Debug log
            
            if (locationId && locationId !== 'unknown') {
                // Salva l'ID della location selezionata
                sessionStorage.setItem('selectedLocationId', locationId);
                console.log('Saved location ID to sessionStorage:', locationId); // Debug log
                
                // Reindirizza alla pagina workspace
                window.location.href = `workspace.html?locationId=${locationId}`;
            } else {
                console.error('Location ID non valido:', locationId);
            }
        });
        
        // Aggiungi stile del cursore per indicare che è cliccabile
        card.style.cursor = 'pointer';
    });
}

