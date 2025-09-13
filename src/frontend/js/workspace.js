// Gestione della pagina di prenotazione workspace: caricamento dettagli, servizi, form, pagamento

document.addEventListener('DOMContentLoaded', async () => {
    // Aspetta che authService sia disponibile
    let authRetries = 0;
    const maxAuthRetries = 50;
    
    while (!window.authService && authRetries < maxAuthRetries) {
        console.log('Waiting for authService...', authRetries);
        await new Promise(resolve => setTimeout(resolve, 100));
        authRetries++;
    }
    
    // Verifica se authService è disponibile
    if (!window.authService) {
        alert('Servizio di autenticazione non disponibile');
        window.location.href = 'login.html';
        return;
    }
    
    // Verifica se l'utente è autenticato
    if (!window.authService.isAuthenticated()) {
        alert('Devi essere autenticato per accedere a questa pagina');
        window.location.href = 'login.html';
        return;
    }

    // Verifica se l'utente ha il ruolo "user" (solo gli utenti possono effettuare prenotazioni)
    if (!window.authService.isUser()) {
        alert('Solo gli utenti con ruolo "User" possono effettuare prenotazioni');
        window.location.href = 'home.html';
        return;
    }
    
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
        
        // Salva gli spazi globalmente per il calcolo del prezzo
        window.currentSpaces = spaces;
        
        // Renderizza le opzioni degli spazi nel select del form
        renderSpaceOptions(spaces);
        
    } catch (error) {
        console.error('Errore nel caricamento della location:', error);
        document.getElementById('booking-message').textContent = 'Errore nel caricamento della location.';
        return;
    }

    // Servizi aggiuntivi rimossi per ora - possono essere aggiunti in futuro

    // Funzione per aggiornare l'anteprima del prezzo
    window.updatePricePreview = async function updatePricePreview() {
        const spaceId = document.getElementById('space-select').value;
        const dateStart = document.getElementById('date-start').value;
        const dateEnd = document.getElementById('date-end').value;
        
        // Aggiorna il prezzo solo se tutti i campi principali sono compilati
        if (spaceId && dateStart && dateEnd) {
            try {
                // Trova lo spazio selezionato per ottenere i dati completi
                const selectedSpace = window.currentSpaces?.find(space => space.id == spaceId);
                
                if (selectedSpace) {
                    // Ottieni gli orari di apertura e chiusura
                    const openingTime = selectedSpace.openingTime || selectedSpace.opening_time || '09:00';
                    const closingTime = selectedSpace.closingTime || selectedSpace.closing_time || '18:00';
                    const pricePerHour = selectedSpace.pricePerHour || selectedSpace.price_per_hour || selectedSpace.spaceType?.price_per_hour || 0;
                    
                    // Calcola le ore di funzionamento giornaliere
                    const openingHour = parseInt(openingTime.split(':')[0]);
                    const closingHour = parseInt(closingTime.split(':')[0]);
                    const hoursPerDay = closingHour - openingHour;
                    
                    // Calcola il numero di giorni tra le date
                    const startDate = new Date(dateStart.split('/').reverse().join('-'));
                    const endDate = new Date(dateEnd.split('/').reverse().join('-'));
                    const diffTime = Math.abs(endDate - startDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 per includere il giorno di inizio
                    
                    // Calcola il prezzo totale: prezzo/ora * ore/giorno * numero giorni
                    const totalPrice = pricePerHour * hoursPerDay * diffDays;
                    
                    const priceEl = document.getElementById('price');
                    if (priceEl) {
                        priceEl.value = totalPrice.toFixed(2);
                    }
                } else {
                    // Fallback al metodo precedente se non troviamo lo spazio
                    const startDate = new Date(dateStart.split('/').reverse().join('-'));
                    const endDate = new Date(dateEnd.split('/').reverse().join('-'));
                    const diffTime = Math.abs(endDate - startDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    
                    const price = await window.apiService.calculateBookingPrice(spaceId, dateStart, '09:00', diffDays * 8, []); // 8 ore predefinite
                    const priceEl = document.getElementById('price');
                    if (priceEl) {
                        priceEl.value = price;
                    }
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
        const selectedSpace = window.currentSpaces?.find(space => space.id == spaceId);
        
        if (selectedSpace) {
            const openingTime = selectedSpace.openingTime || selectedSpace.opening_time || '09:00';
            const closingTime = selectedSpace.closingTime || selectedSpace.closing_time || '18:00';
            const pricePerHour = selectedSpace.pricePerHour || selectedSpace.price_per_hour || selectedSpace.spaceType?.price_per_hour || 0;
            
            const openingHour = parseInt(openingTime.split(':')[0]);
            const closingHour = parseInt(closingTime.split(':')[0]);
            const hoursPerDay = closingHour - openingHour;
            
            const startDate = new Date(dateStart.split('/').reverse().join('-'));
            const endDate = new Date(dateEnd.split('/').reverse().join('-'));
            const diffTime = Math.abs(endDate - startDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            
            const totalPrice = pricePerHour * hoursPerDay * diffDays;
            document.getElementById('total-price').textContent = totalPrice.toFixed(2);
            
            // Popola il riepilogo con tutti i dati
            populateBookingSummary(selectedSpace, dateStart, dateEnd, diffDays, hoursPerDay * diffDays, totalPrice);
        } else {
            // Fallback
            const price = document.getElementById('price').value || '0';
            document.getElementById('total-price').textContent = price;
        }
        
        document.getElementById('payment-section').style.display = 'block';
    });

    // Gestione pagamento - apertura modal
    document.getElementById('pay-button').addEventListener('click', async () => {
        // Copia il prezzo totale nel modal
        const totalPrice = document.getElementById('total-price').textContent;
        document.getElementById('modal-total-price').textContent = totalPrice;
        
        // Mostra il modal di pagamento
        document.getElementById('payment-modal').style.display = 'block';
    });
    
    // Gestione modal di pagamento
    setupPaymentModal();

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
        
        // Ottieni gli orari di apertura e chiusura
        const openingTime = space.openingTime || space.opening_time || '09:00';
        const closingTime = space.closingTime || space.closing_time || '18:00';
        
        return `
            <div class="space-type-card">
                <div class="space-type-name">${space.name || 'Spazio senza nome'}</div>
                <div class="space-type-description">${spaceTypeName}${spaceTypeDescription ? ' - ' + spaceTypeDescription : ''}</div>
                <div class="space-type-hours">Orari: ${openingTime} - ${closingTime}</div>
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

// Funzione per popolare il riepilogo della prenotazione
function populateBookingSummary(selectedSpace, dateStart, dateEnd, totalDays, totalHours, totalPrice) {
    // Dati utente (presi da authService)
    let userData = {};
    if (window.authService) {
        userData = window.authService.getUser() || {};
    } else {
        // Fallback al localStorage
        userData = JSON.parse(localStorage.getItem('userData') || '{}');
    }
    
    document.getElementById('summary-user-name').textContent = userData.name || userData.firstName + ' ' + userData.lastName || 'Utente';
    document.getElementById('summary-user-email').textContent = userData.email || 'Non disponibile';
    
    // Dati location (presi dalla pagina)
    const locationName = document.getElementById('location-name')?.textContent || 'Location';
    const locationAddress = document.getElementById('location-address')?.textContent || 'Indirizzo non disponibile';
    document.getElementById('summary-location-name').textContent = locationName;
    document.getElementById('summary-location-address').textContent = locationAddress;
    
    // Dati spazio
    const spaceTypeName = selectedSpace.spaceType?.name || selectedSpace.space_type?.name || 'Tipo sconosciuto';
    const openingTime = selectedSpace.openingTime || selectedSpace.opening_time || '09:00';
    const closingTime = selectedSpace.closingTime || selectedSpace.closing_time || '18:00';
    
    document.getElementById('summary-space-name').textContent = selectedSpace.name || 'Spazio';
    document.getElementById('summary-space-type').textContent = spaceTypeName;
    document.getElementById('summary-space-hours').textContent = `${openingTime} - ${closingTime}`;
    
    // Dati periodo
    document.getElementById('summary-date-start').textContent = dateStart;
    document.getElementById('summary-date-end').textContent = dateEnd;
    document.getElementById('summary-total-days').textContent = totalDays;
    document.getElementById('summary-total-hours').textContent = totalHours;
}

// Funzione per gestire il modal di pagamento
function setupPaymentModal() {
    const modal = document.getElementById('payment-modal');
    const closeBtn = document.querySelector('.payment-modal-close');
    const paymentForm = document.getElementById('payment-form');
    
    // Chiusura modal con X
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        clearPaymentForm();
    });
    
    // Chiusura modal cliccando fuori
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            clearPaymentForm();
        }
    });
    
    // Gestione submit del form di pagamento
    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await processPayment();
    });
    
    // Formattazione automatica per il numero di carta
    const cardNumberInput = document.getElementById('card-number');
    cardNumberInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
        let formattedValue = value.match(/.{1,4}/g)?.join(' ') || '';
        e.target.value = formattedValue;
    });
    
    // Formattazione automatica per la data di scadenza
    const expiryInput = document.getElementById('expiry-date');
    expiryInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        e.target.value = value;
    });
    
    // Solo numeri per CVV
    const cvvInput = document.getElementById('security-code');
    cvvInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
}

// Funzione per pulire il form di pagamento
function clearPaymentForm() {
    document.getElementById('payment-form').reset();
}

// Funzione per processare il pagamento
async function processPayment() {
    const confirmButton = document.querySelector('.confirm-payment-button');
    const originalText = confirmButton.textContent;
    
    try {
        // Mostra loading
        confirmButton.textContent = 'Elaborazione...';
        confirmButton.disabled = true;
        
        // Raccogli tutti i dati della prenotazione
        const bookingData = {
            spaceId: document.getElementById('space-select').value,
            dateStart: document.getElementById('date-start').value,
            dateEnd: document.getElementById('date-end').value,
            totalPrice: document.getElementById('total-price').textContent,
            paymentData: {
                cardNumber: document.getElementById('card-number').value,
                expiryDate: document.getElementById('expiry-date').value,
                securityCode: document.getElementById('security-code').value
            }
        };
        
        // Chiama il backend per creare la prenotazione
        const result = await createBooking(bookingData);
        
        if (result.success) {
            // Successo - chiudi modal e mostra notifica
            document.getElementById('payment-modal').style.display = 'none';
            clearPaymentForm();
            
            // Mostra notifica di successo
            showSuccessNotification(result.bookingId);
            
            // Mostra anche il messaggio nel contenuto principale
            document.getElementById('booking-message').innerHTML = `
                <div style="color: green; text-align: center; padding: 20px; background: #f0f9f0; border-radius: 10px; margin: 20px; border-left: 5px solid #10b981;">
                    <h3>✅ Prenotazione Completata!</h3>
                    <p>La tua prenotazione è stata confermata e il pagamento è stato elaborato con successo.</p>
                    <p><strong>ID Prenotazione:</strong> ${result.bookingId || 'N/A'}</p>
                    <p style="margin-top: 15px;"><em>Riceverai una email di conferma a breve.</em></p>
                </div>
            `;
            
            // Nascondi il form di prenotazione
            document.querySelector('.workspace-card').style.opacity = '0.7';
            document.querySelector('.workspace-card').style.pointerEvents = 'none';
            
            // Scroll verso il messaggio di successo
            document.getElementById('booking-message').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
        } else {
            throw new Error(result.message || 'Errore durante la prenotazione');
        }
        
    } catch (error) {
        console.error('Errore nel pagamento:', error);
        alert('Errore durante il pagamento: ' + error.message);
    } finally {
        // Ripristina il pulsante
        confirmButton.textContent = originalText;
        confirmButton.disabled = false;
    }
}

// Funzione per creare la prenotazione tramite API
async function createBooking(bookingData) {
    try {
        // Verifica se l'utente è autenticato
        if (!window.authService || !window.authService.isAuthenticated()) {
            throw new Error('Devi essere autenticato per effettuare una prenotazione');
        }
        
        const token = window.authService.getToken();
        if (!token) {
            throw new Error('Token di autenticazione non trovato');
        }
        
        // Prepara i dati per il backend
        const payload = {
            space_id: parseInt(bookingData.spaceId),
            start_date: convertDateFormat(bookingData.dateStart),
            end_date: convertDateFormat(bookingData.dateEnd),
            total_price: parseFloat(bookingData.totalPrice),
            status: 'confirmed'
        };
        
        console.log('Sending booking data:', payload);
        console.log('Using token:', token ? 'Token presente' : 'Token mancante');
        
        // Effettua la chiamata al backend
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            return { success: true, bookingId: result.id, message: result.message };
        } else {
            // Gestisci errori specifici
            if (response.status === 401) {
                throw new Error('Token di accesso non valido');
            }
            return { success: false, message: result.message || 'Errore sconosciuto' };
        }
        
    } catch (error) {
        console.error('Errore nella chiamata API:', error);
        return { success: false, message: error.message || 'Errore di connessione al server' };
    }
}

// Funzione helper per convertire il formato data
function convertDateFormat(dateStr) {
    // Converte da dd/mm/yyyy a yyyy-mm-dd
    const parts = dateStr.split('/');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

// Funzione per mostrare notifica di successo
function showSuccessNotification(bookingId) {
    // Rimuovi eventuali notifiche esistenti
    const existingNotification = document.querySelector('.success-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Crea la notifica
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
        <div class="notification-header">
            <span class="notification-icon">🎉</span>
            <h4 class="notification-title">Pagamento Completato!</h4>
        </div>
        <p class="notification-message">La tua prenotazione è stata confermata con successo.</p>
        ${bookingId ? `<div class="notification-id">ID: ${bookingId}</div>` : ''}
    `;
    
    // Aggiungi al body
    document.body.appendChild(notification);
    
    // Mostra con animazione
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Rimuovi automaticamente dopo 5 secondi
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 500);
    }, 5000);
    
    // Aggiungi evento click per chiudere manualmente
    notification.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 500);
    });
    
    // Riproduci suono di successo (se il browser lo permette)
    try {
        // Crea un suono di successo usando Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        // Ignora errori audio (alcuni browser potrebbero bloccare l'audio automatico)
        console.log('Audio notification not available');
    }
}
