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
    
    if (!locationId) {
        document.getElementById('booking-message').textContent = 'Location non trovata.';
        return;
    }

    // Carica i dettagli della location
    try {
        const locationData = await window.apiService.getLocationById(locationId);
        
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
        
        // Renderizza i dettagli della location CON gli spazi
        await renderLocationDetails(locationData, spaces);
        
        // Renderizza le opzioni degli spazi nel select del form
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
        const dateStart = document.getElementById('date-start').value;
        const dateEnd = document.getElementById('date-end').value;
        
        // Aggiorna il prezzo solo se tutti i campi principali sono compilati
        if (spaceId && dateStart && dateEnd) {
            try {
                // Calcola il numero di giorni tra le date
                const startDate = new Date(dateStart.split('/').reverse().join('-'));
                const endDate = new Date(dateEnd.split('/').reverse().join('-'));
                const diffTime = Math.abs(endDate - startDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 per includere il giorno di inizio
                
                const price = await window.apiService.calculateBookingPrice(spaceId, dateStart, '09:00', diffDays * 24, []);
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
    const dateStartInput = document.getElementById('date-start');
    const dateEndInput = document.getElementById('date-end');

    if (spaceSelect) spaceSelect.addEventListener('change', updatePricePreview);
    if (dateStartInput) dateStartInput.addEventListener('change', updatePricePreview);
    if (dateEndInput) dateEndInput.addEventListener('change', updatePricePreview);

    // Gestione form prenotazione
    const bookingForm = document.getElementById('booking-form');
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dateStart = document.getElementById('date-start').value;
        const dateEnd = document.getElementById('date-end').value;
        const services = Array.from(document.getElementById('services')?.selectedOptions || []).map(opt => opt.value);
        
        // Gestione errore sotto input Data di Inizio
        let errorElStart = document.getElementById('date-start-error');
        if (!dateStart) {
            if (!errorElStart) {
                errorElStart = document.createElement('span');
                errorElStart.id = 'date-start-error';
                errorElStart.className = 'field-error';
                document.getElementById('date-start').parentElement.appendChild(errorElStart);
            }
            errorElStart.textContent = 'Per favore, inserisci una data di inizio.';
            errorElStart.style.color = 'red';
            errorElStart.style.display = 'block';
            errorElStart.style.marginTop = '5px';
            errorElStart.style.fontSize = '14px';
            return;
        } else {
            if (errorElStart) {
                errorElStart.textContent = '';
                errorElStart.style.display = 'none';
            }
        }
        
        // Gestione errore sotto input Data di Fine
        let errorElEnd = document.getElementById('date-end-error');
        if (!dateEnd) {
            if (!errorElEnd) {
                errorElEnd = document.createElement('span');
                errorElEnd.id = 'date-end-error';
                errorElEnd.className = 'field-error';
                document.getElementById('date-end').parentElement.appendChild(errorElEnd);
            }
            errorElEnd.textContent = 'Per favore, inserisci una data di fine.';
            errorElEnd.style.color = 'red';
            errorElEnd.style.display = 'block';
            errorElEnd.style.marginTop = '5px';
            errorElEnd.style.fontSize = '14px';
            return;
        } else {
            if (errorElEnd) {
                errorElEnd.textContent = '';
                errorElEnd.style.display = 'none';
            }
        }
        
        // Calcola prezzo e mostra sezione pagamento
        const spaceId = document.getElementById('space-select').value;
        const startDate = new Date(dateStart.split('/').reverse().join('-'));
        const endDate = new Date(dateEnd.split('/').reverse().join('-'));
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        const price = await window.apiService.calculateBookingPrice(spaceId, dateStart, '09:00', diffDays * 24, services);
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
async function renderLocationDetails(locationData, spaces = []) {
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
        let managerName = 'Nessun manager assegnato';
        
        if (location.manager) {
            if (typeof location.manager === 'string') {
                managerName = location.manager;
            } else if (location.manager.name && location.manager.surname) {
                managerName = `${location.manager.name} ${location.manager.surname}`;
            } else if (location.manager.name) {
                managerName = location.manager.name;
            } else if (location.manager.id) {
                managerName = `Manager ID: ${location.manager.id}`;
            }
        } else if (location.managerId && location.managerId !== null) {
            managerName = `Manager ID: ${location.managerId}`;
        }
        
        locationManagerEl.textContent = `Manager: ${managerName}`;
    }

    // Renderizza gli spazi effettivi invece dei tipi di spazio
    renderSpacesGrid(spaces);
}

// Funzione per renderizzare la griglia degli spazi effettivi
function renderSpacesGrid(spaces) {
    const spaceTypesGrid = document.querySelector('.space-types-grid');
    if (!spaceTypesGrid || !Array.isArray(spaces)) return;

    if (spaces.length === 0) {
        spaceTypesGrid.innerHTML = '<div class="no-space-types">Nessuno spazio disponibile</div>';
        return;
    }

    const spacesHtml = spaces.map(space => {
        const spaceTypeName = space.spaceType?.name || space.space_type?.name || 'Tipo sconosciuto';
        const spaceTypeDescription = space.spaceType?.description || space.space_type?.description || '';
        const price = space.pricePerHour || space.price_per_hour || space.spaceType?.price_per_hour || '0';
        
        return `
            <div class="space-type-card">
                <div class="space-type-name">${space.name || 'Spazio senza nome'}</div>
                <div class="space-type-description">${spaceTypeName}${spaceTypeDescription ? ' - ' + spaceTypeDescription : ''}</div>
                <div class="space-type-price">€${price}/ora</div>
            </div>
        `;
    }).join('');

    spaceTypesGrid.innerHTML = spacesHtml;
}

// Funzione per renderizzare la griglia dei tipi di spazio (mantenuta per compatibilità)
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
        return;
    }

    spaceSelect.innerHTML = '<option value="">Seleziona uno spazio</option>';
    
    spaces.forEach(space => {
        const option = document.createElement('option');
        option.value = space.id;
        option.textContent = `${space.name || 'Spazio'} - ${space.spaceType?.name || space.space_type_name || 'Tipo sconosciuto'}`;
        spaceSelect.appendChild(option);
    });
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
