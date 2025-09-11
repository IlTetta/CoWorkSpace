// Gestione della pagina di prenotazione workspace: caricamento dettagli, servizi, form, pagamento

document.addEventListener('DOMContentLoaded', async () => {
    // Aspetta che apiService sia disponibile
    let retries = 0;
    const maxRetries = 50;
    
    while (!window.apiService && retries < maxRetries) {
        console.log('Waiting for apiService...', retries);
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
    }
    
    if (!window.apiService) {
        console.error('ApiService not available after waiting');
        document.getElementById('booking-message').textContent = 'Servizio API non disponibile.';
        return;
    }

    // Recupera l'ID della location da sessionStorage o query string
    const locationId = sessionStorage.getItem('selectedLocationId') || getLocationIdFromUrl();
    console.log('Location ID retrieved:', locationId); // Debug log
    console.log('SessionStorage value:', sessionStorage.getItem('selectedLocationId')); // Debug log
    console.log('URL parameter:', getLocationIdFromUrl()); // Debug log
    
    if (!locationId) {
        document.getElementById('booking-message').textContent = 'Location non trovata.';
        return;
    }

    // Carica i dettagli della location
    try {
        const locationData = await window.apiService.getLocationById(locationId);
        await renderLocationDetails(locationData);
        
        // Usa gli spazi dall'endpoint complete se disponibili, altrimenti carica separatamente
        let spaces = [];
        if (locationData.spaces && Array.isArray(locationData.spaces)) {
            spaces = locationData.spaces;
        } else {
            try {
                spaces = await window.apiService.getSpacesByLocation(locationId);
            } catch (spaceError) {
                console.warn('Errore nel caricamento degli spazi separatamente:', spaceError);
                spaces = [];
            }
        }
        
        renderSpaceOptions(spaces);
        
    } catch (error) {
        console.error('Errore nel caricamento della location:', error);
        document.getElementById('booking-message').textContent = 'Errore nel caricamento della location.';
        return;
    }

    // Servizi aggiuntivi rimossi per ora - possono essere aggiunti in futuro

    // Funzione per aggiornare l'anteprima del prezzo
    async function updatePricePreview() {
        const spaceId = document.getElementById('space-select').value;
        const date = document.getElementById('date').value;
        const time = document.getElementById('time').value;
        const duration = document.getElementById('duration').value;
        
        // Aggiorna il prezzo solo se tutti i campi principali sono compilati
        if (spaceId && date && time && duration) {
            try {
                const price = await window.apiService.calculateBookingPrice(spaceId, date, time, duration, []);
                const priceEl = document.getElementById('price');
                if (priceEl) {
                    priceEl.value = price;
                }
            } catch (error) {
                console.error('Error calculating price:', error);
                const priceEl = document.getElementById('price');
                if (priceEl) {
                    priceEl.value = '';
                    priceEl.placeholder = '-';
                }
            }
        } else {
            const priceEl = document.getElementById('price');
            if (priceEl) {
                priceEl.value = '';
                priceEl.placeholder = '0';
            }
        }
    }

    // Aggiungi i listener per l'aggiornamento dinamico del prezzo
    const spaceSelect = document.getElementById('space-select');
    const dateInput = document.getElementById('date');
    const timeInput = document.getElementById('time');
    const durationInput = document.getElementById('duration');

    if (spaceSelect) spaceSelect.addEventListener('change', updatePricePreview);
    if (dateInput) dateInput.addEventListener('change', updatePricePreview);
    if (timeInput) timeInput.addEventListener('change', updatePricePreview);
    if (durationInput) durationInput.addEventListener('change', updatePricePreview);

    // Gestione form prenotazione
    const bookingForm = document.getElementById('booking-form');
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('date').value;
        const time = document.getElementById('time').value;
        const duration = document.getElementById('duration').value;
        const services = Array.from(document.getElementById('services')?.selectedOptions || []).map(opt => opt.value);
        // Gestione errore sotto input Data
        let errorEl = document.getElementById('date-error');
        if (!date) {
            if (!errorEl) {
                errorEl = document.createElement('span');
                errorEl.id = 'date-error';
                errorEl.className = 'field-error';
                document.getElementById('date').parentElement.appendChild(errorEl);
            }
            errorEl.textContent = 'Per favore, inserisci una data.';
            errorEl.style.color = 'red';
            errorEl.style.display = 'block';
            errorEl.style.marginTop = '5px';
            errorEl.style.fontSize = '14px';
            return;
        } else {
            if (errorEl) {
                errorEl.textContent = '';
                errorEl.style.display = 'none';
            }
        }
        // Calcola prezzo e mostra sezione pagamento
        const price = await window.apiService.calculateBookingPrice(workspaceId, date, time, duration, services);
        document.getElementById('total-price').textContent = price;
        document.getElementById('payment-section').style.display = 'block';
    });

    // Gestione pagamento
    document.getElementById('pay-button').addEventListener('click', async () => {
        // Simula chiamata API pagamento
        const result = await window.apiService.payForBooking();
        document.getElementById('booking-message').textContent = result.success ? 'Prenotazione e pagamento riusciti!' : 'Errore nel pagamento.';
    });

    // Gestisce il click sul logo per reindirizzare a home.html
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'home.html';
        });
    }

    // Gestisce il click sul pulsante "Torna alla Home"
    const backButton = document.getElementById('back-to-home');
    if (backButton) {
        backButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'home.html';
        });
    }
});

// Funzione per renderizzare i dettagli della location nella sezione sinistra
async function renderLocationDetails(locationData) {
    console.log('Location data received:', locationData); // Debug log
    
    // L'endpoint base restituisce {location: {...}, statistics: {...}}
    const location = locationData.location || locationData;
    
    // Aggiorna il nome della location
    const locationNameEl = document.getElementById('location-name');
    if (locationNameEl) {
        locationNameEl.textContent = location.name || 'Nome non disponibile';
    }

    // Aggiorna la città
    const locationCityEl = document.getElementById('location-city');
    if (locationCityEl) {
        locationCityEl.textContent = location.city || 'Città';
    }

    // Aggiorna l'indirizzo
    const locationAddressEl = document.getElementById('location-address');
    if (locationAddressEl) {
        locationAddressEl.textContent = location.address || 'Indirizzo non disponibile';
    }

    // Aggiorna la descrizione
    const locationDescEl = document.getElementById('location-description');
    if (locationDescEl) {
        locationDescEl.textContent = location.description || 'Descrizione non disponibile';
    }

    // Aggiorna il manager
    const locationManagerEl = document.querySelector('.location-manager');
    if (locationManagerEl) {
        let managerName = 'Non specificato';
        
        if (location.manager) {
            if (typeof location.manager === 'string') {
                managerName = location.manager;
            } else if (location.manager.name && location.manager.surname) {
                managerName = `${location.manager.name} ${location.manager.surname}`;
            } else if (location.manager.name) {
                managerName = location.manager.name;
            }
        }
        
        locationManagerEl.textContent = `Manager: ${managerName}`;
    }

    // Carica e renderizza i tipi di spazio per questa location
    try {
        const spaceTypes = await window.apiService.getSpaceTypesByLocation(location.id);
        renderSpaceTypesGrid(spaceTypes);
    } catch (error) {
        console.error('Errore nel caricamento dei tipi di spazio:', error);
        const spaceTypesGrid = document.querySelector('.space-types-grid');
        if (spaceTypesGrid) {
            spaceTypesGrid.innerHTML = '<div class="error">Errore nel caricamento dei tipi di spazio</div>';
        }
    }
}

// Funzione per renderizzare la griglia dei tipi di spazio
function renderSpaceTypesGrid(spaceTypes) {
    const spaceTypesGrid = document.querySelector('.space-types-grid');
    if (!spaceTypesGrid || !Array.isArray(spaceTypes)) return;

    if (spaceTypes.length === 0) {
        spaceTypesGrid.innerHTML = '<div class="no-space-types">Nessun tipo di spazio disponibile</div>';
        return;
    }

    const spaceTypesHtml = spaceTypes.map(type => `
        <div class="space-type-card">
            <div class="space-type-name">${type.name || 'Tipo sconosciuto'}</div>
            <div class="space-type-description">${type.description || ''}</div>
            <div class="space-type-price">€${type.price || '0'}/ora</div>
        </div>
    `).join('');

    spaceTypesGrid.innerHTML = spaceTypesHtml;
}

// Funzione helper per estrarre i tipi di spazio dagli spazi disponibili
function extractSpaceTypesFromSpaces(spaces) {
    if (!Array.isArray(spaces)) return [];
    
    const spaceTypesMap = new Map();
    
    spaces.forEach(space => {
        if (space.space_type) {
            const typeKey = space.space_type.id || space.space_type_id;
            if (!spaceTypesMap.has(typeKey)) {
                spaceTypesMap.set(typeKey, {
                    id: space.space_type.id || space.space_type_id,
                    name: space.space_type.name || space.space_type_name,
                    description: space.space_type.description,
                    price: space.space_type.price_per_hour || space.price_per_hour
                });
            }
        }
    });
    
    return Array.from(spaceTypesMap.values());
}

// Funzione per renderizzare le opzioni degli spazi nel select
function renderSpaceOptions(spaces) {
    const spaceSelect = document.getElementById('space-select');
    if (!spaceSelect || !Array.isArray(spaces)) {
        console.error('Space select element not found or spaces not array:', spaceSelect, spaces);
        return;
    }

    spaceSelect.innerHTML = '<option value="">Seleziona uno spazio</option>';
    
    spaces.forEach(space => {
        const option = document.createElement('option');
        option.value = space.id;
        option.textContent = `${space.name || 'Spazio'} - ${space.spaceType?.name || space.space_type_name || 'Tipo sconosciuto'}`;
        spaceSelect.appendChild(option);
    });
    
    console.log(`Added ${spaces.length} spaces to select`); // Debug log
}

// Funzione per renderizzare i servizi aggiuntivi
function renderServicesOptions(services) {
    const select = document.getElementById('services');
    if (!select || !Array.isArray(services)) return;
    
    select.innerHTML = '';
    services.forEach(service => {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = `${service.name} (+€${service.price})`;
        select.appendChild(option);
    });
}

// Funzione per ottenere l'ID della location dall'URL
function getLocationIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('locationId') || params.get('id');
}

// Funzione deprecata - mantenuta per compatibilità
function getWorkspaceIdFromUrl() {
    return getLocationIdFromUrl();
}
