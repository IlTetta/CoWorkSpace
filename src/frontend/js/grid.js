// Funzione per ottenere tutte le locations, opzionalmente filtrate per città
async function getAllLocations(city = null) {
    try {
        // Costruisci l'URL dell'endpoint API, non del file del controller
        let url = 'http://localhost:3000/api/locations'; // Cambia la porta se diversa
        if (city) {
            url += `?city=${encodeURIComponent(city)}`;
        }

        const response = await fetch(url);
        
        // Controlla se la risposta è ok
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            console.log('Locations trovate:', data.results);
            return data.data.locations;
        } else {
            throw new Error('Errore nel recupero delle locations');
        }
    } catch (error) {
        console.error('Errore:', error);
        throw error;
    }
}

// Funzione per ottenere i tipi di spazi di una location
async function getLocationSpaceTypes(locationId) {
    try {
        const response = await fetch(`http://localhost:3000/api/spaces?location_id=${locationId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Estrae i tipi di spazi e trova il più comune
            const spaceTypes = data.data.spaces.map(space => space.type_name);
            const typeCount = {};
            
            spaceTypes.forEach(type => {
                typeCount[type] = (typeCount[type] || 0) + 1;
            });
            
            // Trova il tipo più comune
            const mostCommonType = Object.keys(typeCount).reduce((a, b) => 
                typeCount[a] > typeCount[b] ? a : b, 'Spazio generico'
            );
            
            return mostCommonType;
        }
        
        return 'Spazio generico';
    } catch (error) {
        console.error('Errore nel recupero dei tipi di spazi:', error);
        return 'Spazio generico';
    }
}

// Funzione per ottenere solo i nomi delle città
async function getCityNames() {
    try {
        const locations = await getAllLocations();
        
        // Estrae solo i nomi delle città dall'array di locations
        const cityNames = locations.map(location => location.city);
        
        // Rimuove eventuali duplicati usando Set
        const uniqueCityNames = [...new Set(cityNames)];
        
        console.log('Array dei nomi delle città:', uniqueCityNames);
        return uniqueCityNames;
        
    } catch (error) {
        console.error('Errore nel recupero dei nomi delle città:', error);
        return [];
    }
}

// Funzione per generare un colore pastello casuale usando HSL
function getRandomPastelColor() {
    const hue = Math.floor(Math.random() * 360); // Hue da 0 a 359
    return `hsl(${hue}, 50%, 90%)`;
}

async function renderGrid(locations) {
    // Clear the existing locations list HTML
    document.querySelector('.grid-container').innerHTML = '';

    // Generate the HTML for each location
    let locationsHtml = '';
    for (let i = 0; i < locations.length; i++) {
        const location = locations[i];
        const { location_name, city, address, location_id } = location;
        const randomColor = getRandomPastelColor();
        
        // Ottieni il tipo di location principale
        const locationType = await getLocationSpaceTypes(location_id);
        
        const html = `
            <div class="location-card">
                <div class="location-name" style="--random-color: ${randomColor}">${location_name}</div>
                <div class="location-type">${locationType}</div>
                <div class="location-city">${city}</div>
                <div class="location-address">${address}</div>
            </div>
        `;
        locationsHtml += html;
    }

    // Insert the generated HTML into the page
    document.querySelector('.grid-container').innerHTML = locationsHtml;
}

// Esempio di chiamata per ottenere e visualizzare le locations
async function displayLocations() {
    try {
        const locations = await getAllLocations();
        renderGrid(locations);
    } catch (error) {
        console.error('Errore durante il recupero delle locations:', error);
    }
}

displayLocations();

