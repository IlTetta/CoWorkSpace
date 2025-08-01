// Esempio di chiamata dal frontend
async function getAllLocations(city = null) {
    try {
        // Costruisci l'URL dell'endpoint API, non del file del controller
        let url = 'postgresql://postgres:admin@localhost:5432/postgresPORT=3000'; // Cambia la porta se diversa
        if (city) {
            url += `?city=${encodeURIComponent(city)}`;
        }

        const response = await fetch(url);
        
        // Controlla se la risposta è ok
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(data);
        
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

// Esempi di utilizzo:
// Tutte le locations
getAllLocations().then(locations => {
    console.log(locations);
});

// Locations filtrate per città
getAllLocations('Milano').then(locations => {
    console.log(locations);
});