// dashboard-admin.js
// Popola le sezioni admin: richieste manager, lista utenti, lista manager

document.addEventListener('DOMContentLoaded', () => {
    loadManagerRequests();
    loadUsersList();
    loadManagersList();
    loadUserProfile();
    setupEventListeners();
    setupModalEventListeners();
    
    // Inizializza le nuove gestioni
    initializeLocationManagement();
    initializeWorkspaceManagement();
    
    // Carica liste legacy per compatibilità
    loadBookingsList();
});

// Funzione per mostrare messaggi
function showMessage(message, type = 'success') {
    const container = document.getElementById('message-container');
    if (!container) {
        alert(message);
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    container.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Setup event listeners per header
function setupEventListeners() {
    const homeBtn = document.getElementById('home-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const logo = document.querySelector('.logo');
    
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            window.location.href = 'home.html';
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('coworkspace_token');
            localStorage.removeItem('coworkspace_user');
            window.location.href = 'login.html';
        });
    }
    
    if (logo) {
        logo.addEventListener('click', () => {
            window.location.href = 'home.html';
        });
    }
    
    // Event listeners per i pulsanti di refresh e creazione
    const refreshManagerRequestsBtn = document.getElementById('refresh-manager-requests');
    const refreshUsersListBtn = document.getElementById('refresh-users-list');
    const refreshManagersListBtn = document.getElementById('refresh-managers-list');
    const refreshLocationsListBtn = document.getElementById('refresh-locations-list');
    const refreshSpacesListBtn = document.getElementById('refresh-spaces-list');
    const refreshBookingsListBtn = document.getElementById('refresh-bookings-list');
    
    if (refreshManagerRequestsBtn) {
        refreshManagerRequestsBtn.addEventListener('click', loadManagerRequests);
    }
    
    if (refreshUsersListBtn) {
        refreshUsersListBtn.addEventListener('click', loadUsersList);
    }
    
    if (refreshManagersListBtn) {
        refreshManagersListBtn.addEventListener('click', loadManagersList);
    }
    
    if (refreshLocationsListBtn) {
        refreshLocationsListBtn.addEventListener('click', loadLocationsList);
    }
    
    if (refreshSpacesListBtn) {
        refreshSpacesListBtn.addEventListener('click', loadSpaces);
    }
    
    if (refreshBookingsListBtn) {
        refreshBookingsListBtn.addEventListener('click', loadBookingsList);
    }
}

// Carica profilo utente admin
function loadUserProfile() {
    const user = JSON.parse(localStorage.getItem('coworkspace_user') || '{}');
    
    document.getElementById('display-name').textContent = user.name || 'Admin';
    document.getElementById('display-surname').textContent = user.surname || '';
    document.getElementById('display-email').textContent = user.email || '';
    document.getElementById('display-role').textContent = 'Administrator';
    
    if (user.created_at) {
        const date = new Date(user.created_at).toLocaleDateString('it-IT');
        document.getElementById('display-registration').textContent = date;
    }
}

// Carica richieste manager pendenti
function loadManagerRequests() {
    // Mostra feedback di caricamento
    const container = document.getElementById('manager-requests-list');
    container.innerHTML = '<p>🔄 Caricamento richieste...</p>';
    
    fetch('https://coworkspace-fxyv.onrender.com/api/admin/users/manager-requests/pending', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`,
            'Content-Type': 'application/json'
        }
    })
        .then(res => res.json())
        .then(data => {
            container.innerHTML = '';
            
            if (!data.success || !data.data || !data.data.items || data.data.items.length === 0) {
                container.innerHTML = '<p>Nessuna richiesta pendente.</p>';
                return;
            }
            
            data.data.items.forEach(request => {
                const userId = request.user_id || request.id; // Fallback per id
                if (!userId) {
                    console.error('user_id mancante per:', request);
                    return;
                }
                
                const div = document.createElement('div');
                div.className = 'request-item';
                div.innerHTML = `
                    <span>${request.name} ${request.surname} (${request.email})</span>
                    <div class="request-actions">
                        <button class="accept-btn" data-user-id="${userId}" title="Accetta richiesta">✓</button>
                        <button class="reject-btn" data-user-id="${userId}" title="Rifiuta richiesta">✗</button>
                    </div>
                `;
                container.appendChild(div);
                
                // Aggiungi event listeners per i pulsanti
                const acceptBtn = div.querySelector('.accept-btn');
                const rejectBtn = div.querySelector('.reject-btn');
                
                acceptBtn.addEventListener('click', function() {
                    if (confirm('Sei sicuro di voler approvare questo utente come manager?')) {
                        acceptManager(userId);
                    }
                });
                
                rejectBtn.addEventListener('click', function() {
                    if (confirm('Sei sicuro di voler rifiutare questa richiesta?')) {
                        rejectManager(userId);
                    }
                });
            });
        })
        .catch(err => {
            console.error('Errore nel caricamento richieste manager:', err);
            container.innerHTML = '<p>Errore nel caricamento delle richieste.</p>';
        });
}

function acceptManager(userId) {
    fetch(`https://coworkspace-fxyv.onrender.com/api/admin/users/${userId}/approve-manager`, { 
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`,
            'Content-Type': 'application/json'
        }
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                loadManagerRequests();
                loadManagersList(); // Aggiorna anche la lista manager
                showMessage('Richiesta manager approvata con successo!', 'success');
            } else {
                showMessage('Errore nell\'approvazione della richiesta', 'error');
            }
        })
        .catch(err => {
            console.error('Errore nell\'approvazione:', err);
            showMessage('Errore nell\'approvazione della richiesta', 'error');
        });
}

function rejectManager(userId) {
    fetch(`https://coworkspace-fxyv.onrender.com/api/admin/users/${userId}/reject-manager`, { 
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`,
            'Content-Type': 'application/json'
        }
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                loadManagerRequests();
                showMessage('Richiesta manager rifiutata.', 'success');
            } else {
                showMessage('Errore nel rifiuto della richiesta', 'error');
            }
        })
        .catch(err => {
            console.error('Errore nel rifiuto:', err);
            showMessage('Errore nel rifiuto della richiesta', 'error');
        });
}

// Carica lista utenti
function loadUsersList() {
    // Mostra feedback di caricamento
    const container = document.getElementById('users-list');
    container.innerHTML = '<p>🔄 Caricamento utenti...</p>';
    
    fetch('https://coworkspace-fxyv.onrender.com/api/admin/users?role=user', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`,
            'Content-Type': 'application/json'
        }
    })
        .then(res => res.json())
        .then(data => {
            container.innerHTML = '';
            
            if (!data.success || !data.data || !data.data.users || data.data.users.length === 0) {
                container.innerHTML = '<p>Nessun utente trovato.</p>';
                return;
            }
            
            data.data.users.forEach(user => {
                const div = document.createElement('div');
                div.className = 'user-item';
                div.innerHTML = `
                    <span>${user.name} ${user.surname} (${user.email})</span>
                `;
                container.appendChild(div);
            });
        })
        .catch(err => {
            console.error('Errore nel caricamento utenti:', err);
            container.innerHTML = '<p>Errore nel caricamento degli utenti.</p>';
        });
}

// Carica lista manager
function loadManagersList() {
    
    // Mostra feedback di caricamento
    const container = document.getElementById('managers-list');
    if (!container) {
        return;
    }
    
    container.innerHTML = '<p>🔄 Caricamento manager...</p>';
    
    fetch('https://coworkspace-fxyv.onrender.com/api/admin/managers', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`,
            'Content-Type': 'application/json'
        }
    })
        .then(res => res.json())
        .then(data => {
            container.innerHTML = '';
            
            if (!data.success || !data.data || !data.data.managers || data.data.managers.length === 0) {
                container.innerHTML = '<p>Nessun manager trovato.</p>';
                return;
            }
            
            data.data.managers.forEach(manager => {
                const div = document.createElement('div');
                div.className = 'manager-item';
                div.innerHTML = `
                    <span>${manager.name} ${manager.surname} (${manager.email})</span>
                `;
                container.appendChild(div);
            });
        })
        .catch(err => {
            console.error('Errore nel caricamento manager:', err);
            container.innerHTML = '<p>Errore nel caricamento dei manager.</p>';
        });
}

// === GESTIONE LOCATION ===
/**
 * Inizializza la gestione delle location
 */
function initializeLocationManagement() {
    // Event listeners per i pulsanti principali
    const createLocationBtn = document.getElementById('create-location-btn');
    const refreshLocationsBtn = document.getElementById('refresh-locations-btn');
    const closeLocationModalBtn = document.getElementById('close-location-modal');
    const cancelLocationFormBtn = document.getElementById('cancel-location-form');
    const locationForm = document.getElementById('location-form');
    
    // Event listeners per la ricerca
    const locationSearchInput = document.getElementById('locations-search-input');
    const locationSearchBtn = document.getElementById('locations-search-btn');

    if (refreshLocationsBtn) {
        refreshLocationsBtn.addEventListener('click', loadLocationsList);
    }

    if (closeLocationModalBtn) {
        closeLocationModalBtn.addEventListener('click', closeLocationModal);
    }

    if (cancelLocationFormBtn) {
        cancelLocationFormBtn.addEventListener('click', closeLocationModal);
    }

    if (locationForm) {
        locationForm.addEventListener('submit', handleLocationFormSubmit);
    }
    
    // Gestori per la ricerca location
    if (locationSearchInput) {
        locationSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                filterLocations(this.value);
            }
        });
    }
    
    if (locationSearchBtn) {
        locationSearchBtn.addEventListener('click', function() {
            const searchTerm = locationSearchInput?.value || '';
            filterLocations(searchTerm);
        });
    }

    // Chiude il modal cliccando fuori
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('location-modal');
        if (event.target === modal) {
            closeLocationModal();
        }
    });

    // Carica i dati iniziali
    loadLocationsList();
}

/**
 * Carica le location dal server (ADMIN vede tutte le location)
 */
async function loadLocationsList() {
    const locationsGrid = document.getElementById('locations-list');
    if (!locationsGrid) {
        return;
    }

    // Mostra stato di caricamento
    locationsGrid.innerHTML = '<div class="loading">Caricamento location...</div>';

    try {
    const response = await fetch('https://coworkspace-fxyv.onrender.com/api/admin/locations', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Gestisci diversi formati di risposta API
        let locations = [];
        if (data.data && data.data.items) {
            locations = data.data.items;
        } else if (data.data && Array.isArray(data.data)) {
            locations = data.data;
        } else if (data.items) {
            locations = data.items;
        } else if (Array.isArray(data)) {
            locations = data;
        } else if (data.data) {
            // Ispeziona tutte le proprietà di data.data
            for (const [key, value] of Object.entries(data.data)) {
                if (Array.isArray(value)) {
                    locations = value;
                    break;
                }
            }
        } else {
            console.log('Formato dati non riconosciuto:', data);
        }

        if (!locations || locations.length === 0) {
            locationsGrid.innerHTML = `
                <div class="empty-state">
                    <div class="material-symbols-outlined">location_on</div>
                    <p>Nessuna location trovata</p>
                    <p>Le location verranno create dai manager</p>
                </div>
            `;
            return;
        }

        // Renderizza le location
        locationsGrid.innerHTML = '';
        locations.forEach(location => {
            const locationCard = createLocationCard(location);
            locationsGrid.appendChild(locationCard);
        });

    } catch (error) {
        console.error('Errore nel caricamento delle location:', error);
        locationsGrid.innerHTML = `
            <div class="empty-state">
                <p>Errore nel caricamento delle location</p>
                <button class="refresh-btn" onclick="loadLocationsList()">Riprova</button>
            </div>
        `;
    }
}

/**
 * Filtra le location in base al termine di ricerca
 */
function filterLocations(searchTerm) {
    const locationsGrid = document.getElementById('locations-list');
    if (!locationsGrid) return;
    
    const locationItems = locationsGrid.querySelectorAll('.location-item');
    const normalizedSearch = searchTerm.toLowerCase().trim();
    
    // Rimuovi messaggio precedente se presente
    const existingMessage = locationsGrid.querySelector('.search-results-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    if (!normalizedSearch) {
        // Se la ricerca è vuota, mostra tutte le location
        locationItems.forEach(item => {
            item.style.display = 'block';
        });
        return;
    }
    
    let visibleCount = 0;
    locationItems.forEach(item => {
        const itemText = item.textContent.toLowerCase();
        
        if (itemText.includes(normalizedSearch)) {
            item.style.display = 'block';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Mostra messaggio se nessun risultato
    if (visibleCount === 0) {
        showNoLocationResultsMessage(searchTerm);
    }
}

/**
 * Mostra messaggio quando non ci sono risultati per le location
 */
function showNoLocationResultsMessage(searchTerm) {
    const locationsGrid = document.getElementById('locations-list');
    if (!locationsGrid) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'search-results-message';
    messageDiv.style.textAlign = 'center';
    messageDiv.style.padding = '20px';
    messageDiv.style.color = '#666';
    messageDiv.style.fontSize = '16px';
    
    messageDiv.innerHTML = `
        <div style="color: #ff5722;">
            <strong>Nessuna location trovata</strong><br>
            <span style="font-size: 14px; color: #999;">Prova con una ricerca diversa per "${searchTerm}"</span>
        </div>
    `;
    
    locationsGrid.appendChild(messageDiv);
}

/**
 * Crea un elemento lista per visualizzare una location (formato admin)
 */
function createLocationCard(location) {
    const div = document.createElement('div');
    div.className = 'location-item';
    
    const locationId = location.location_id || location.id;
    
    div.innerHTML = `
        <div class="item-info">
            <div class="item-title">${location.name || location.location_name || 'Nome non disponibile'}</div>
        </div>
        <div class="item-actions">
            <button class="edit-btn square-btn" data-location-id="${locationId}" title="Modifica">
                <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="delete-btn square-btn" data-location-id="${locationId}" title="Elimina">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
    `;
    
    // Aggiungi event listeners ai pulsanti
    const editBtn = div.querySelector('.edit-btn');
    const deleteBtn = div.querySelector('.delete-btn');
    
    editBtn.addEventListener('click', () => editLocation(locationId));
    deleteBtn.addEventListener('click', () => deleteLocation(locationId));
    
    return div;
}

/**
 * Apre il modal per creare una nuova location
 */
function openCreateLocationModal() {
    const modal = document.getElementById('location-modal');
    const modalTitle = document.getElementById('location-modal-title');
    const form = document.getElementById('location-form');
    
    if (modal && modalTitle && form) {
        modalTitle.textContent = 'Aggiungi Nuova Location';
        form.reset();
        
        form.dataset.mode = 'create';
        delete form.dataset.locationId;
        modal.style.display = 'block';
    }
}

/**
 * Apre il modal per modificare una location esistente
 */
async function editLocation(locationId) {
    try {
    const response = await fetch(`https://coworkspace-fxyv.onrender.com/api/admin/locations/${locationId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Gestisci diversi formati di risposta API
        let location = null;
        if (data.data && data.data.location) {
            location = data.data.location;
        } else if (data.data) {
            location = data.data;
        } else if (data.location) {
            location = data.location;
        } else {
            location = data;
        }
        
        const modal = document.getElementById('location-modal');
        const modalTitle = document.getElementById('location-modal-title');
        const form = document.getElementById('location-form');
        
        if (modal && modalTitle && form && location) {
            modalTitle.textContent = 'Modifica Location';
            
            // Popola il form con i dati esistenti
            const nameField = document.getElementById('location-name');
            const descField = document.getElementById('location-description');
            const addressField = document.getElementById('location-address');
            const cityField = document.getElementById('location-city');
            
            if (nameField) nameField.value = location.name || location.location_name || '';
            if (descField) descField.value = location.description || '';
            if (addressField) addressField.value = location.address || '';
            if (cityField) cityField.value = location.city || '';
            
            form.dataset.mode = 'edit';
            form.dataset.locationId = locationId;
            modal.style.display = 'block';
        }
    } catch (error) {
        console.error('Errore nel caricamento della location:', error);
        alert('Errore nel caricamento dei dati della location: ' + error.message);
    }
}

/**
 * Elimina una location
 */
async function deleteLocation(locationId) {
    if (!confirm('Sei sicuro di voler eliminare questa location? Questa azione eliminerà anche tutti gli spazi associati e non può essere annullata.')) {
        return;
    }

    try {
    const response = await fetch(`https://coworkspace-fxyv.onrender.com/api/admin/locations/${locationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        alert('Location eliminata con successo');
        loadLocationsList(); // Ricarica la lista
        loadLocations(); // Ricarica anche la lista nel form degli spazi
    } catch (error) {
        console.error('Errore nell\'eliminazione della location:', error);
        alert('Errore nell\'eliminazione della location');
    }
}

/**
 * Chiude il modal delle location
 */
function closeLocationModal() {
    const modal = document.getElementById('location-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Gestisce l'invio del form per creare/modificare location
 */
async function handleLocationFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const locationData = Object.fromEntries(formData);
    
    // Converti i valori necessari per l'admin
    locationData.location_name = locationData.name; // Mappa il nome
    
    // Rimuovi campi non necessari
    delete locationData.name;

    try {
        let response;
        
        if (form.dataset.mode === 'edit') {
            // Modifica location esistente
            const locationId = parseInt(form.dataset.locationId);
            response = await fetch(`https://coworkspace-fxyv.onrender.com/api/admin/locations/${locationId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(locationData)
            });
        } else {
            // Crea nuova location (solo admin può creare location)
            response = await fetch('https://coworkspace-fxyv.onrender.com/api/admin/locations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(locationData)
            });
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Location salvata:', result);

        if (form.dataset.mode === 'edit') {
            alert('Location modificata con successo');
        } else {
            alert('Location creata con successo');
        }

        closeLocationModal();
        loadLocationsList(); // Ricarica la lista delle location
        loadLocations(); // Ricarica anche la lista nel form degli spazi
    } catch (error) {
        console.error('Errore nel salvataggio della location:', error);
        alert('Errore nel salvataggio della location: ' + (error.message || 'Errore sconosciuto'));
    }
}

// === GESTIONE SPAZI ===

/**
 * Inizializza la gestione degli spazi di lavoro
 */
function initializeWorkspaceManagement() {
    // Event listeners per i pulsanti principali
    const createSpaceBtn = document.getElementById('create-space-btn');
    const refreshSpacesBtn = document.getElementById('refresh-spaces-btn');
    const closeModalBtn = document.getElementById('close-space-modal');
    const cancelFormBtn = document.getElementById('cancel-space-form');
    const spaceForm = document.getElementById('space-form');
    
    // Event listeners per la ricerca
    const searchInput = document.getElementById('spaces-search-input');
    const searchBtn = document.getElementById('spaces-search-btn');

    if (refreshSpacesBtn) {
        refreshSpacesBtn.addEventListener('click', loadSpaces);
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeSpaceModal);
    }

    if (cancelFormBtn) {
        cancelFormBtn.addEventListener('click', closeSpaceModal);
    }

    if (spaceForm) {
        spaceForm.addEventListener('submit', handleSpaceFormSubmit);
    }
    
    // Gestori per la ricerca (come nella home)
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                filterSpaces(this.value);
            }
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const searchTerm = searchInput?.value || '';
            filterSpaces(searchTerm);
        });
    }

    // Chiude il modal cliccando fuori
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('space-modal');
        if (event.target === modal) {
            closeSpaceModal();
        }
    });

    // Carica i dati iniziali
    loadLocations();
    loadSpaceTypes();
    loadSpaces();
    
    // Inizializza gestori per i checkbox dei giorni
    initializeDayCheckboxes();
}

/**
 * Inizializza i gestori per i checkbox dei giorni
 */
function initializeDayCheckboxes() {
    // Aggiungi gestori di eventi per tutti i checkbox dei giorni
    document.addEventListener('change', function(e) {
        if (e.target.name === 'available_days' && e.target.type === 'checkbox') {
            const label = e.target.closest('.day-checkbox');
            if (label) {
                if (e.target.checked) {
                    label.classList.add('checked');
                } else {
                    label.classList.remove('checked');
                }
            }
        }
    });
}

/**
 * Carica tutte le location disponibili (ADMIN vede tutte)
 */
async function loadLocations() {
    try {
    const response = await fetch('https://coworkspace-fxyv.onrender.com/api/admin/locations', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Gestisci diversi formati di risposta API
        let locations = [];
        if (data.data && data.data.items) {
            locations = data.data.items;
        } else if (data.data && Array.isArray(data.data)) {
            locations = data.data;
        } else if (data.items) {
            locations = data.items;
        } else if (Array.isArray(data)) {
            locations = data;
        }
        
        const locationSelect = document.getElementById('space-location');
        
        if (locationSelect && locations) {
            locationSelect.innerHTML = '<option value="">Seleziona una location</option>';
            locations.forEach(location => {
                const option = document.createElement('option');
                option.value = location.location_id || location.id;
                option.textContent = `${location.name} - ${location.city}`;
                locationSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Errore nel caricamento delle location:', error);
    }
}

/**
 * Carica tutti i tipi di spazio disponibili
 */
async function loadSpaceTypes() {
    try {
        const response = await fetch('/api/space-types', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Gestisci diversi formati di risposta API
        let spaceTypes = [];
        if (data.data && data.data.items) {
            spaceTypes = data.data.items;
        } else if (data.data && Array.isArray(data.data)) {
            spaceTypes = data.data;
        } else if (data.items) {
            spaceTypes = data.items;
        } else if (Array.isArray(data)) {
            spaceTypes = data;
        } else if (data.space_types) {
            spaceTypes = data.space_types;
        }
        
        const spaceTypeSelect = document.getElementById('space-type');
        
        if (spaceTypeSelect) {
            spaceTypeSelect.innerHTML = '<option value="">Seleziona un tipo</option>';
            
            // Verifica che spaceTypes sia un array
            if (Array.isArray(spaceTypes) && spaceTypes.length > 0) {
                spaceTypes.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.space_type_id || type.id;
                    option.textContent = type.type_name || type.name;
                    spaceTypeSelect.appendChild(option);
                });
            } else {
                console.warn('spaceTypes non è un array o è vuoto:', spaceTypes);
                spaceTypeSelect.innerHTML = '<option value="">Nessun tipo disponibile</option>';
            }
        }
    } catch (error) {
        console.error('Errore nel caricamento dei tipi di spazio:', error);
        
        // Fallback in caso di errore
        const spaceTypeSelect = document.getElementById('space-type');
        if (spaceTypeSelect) {
            spaceTypeSelect.innerHTML = '<option value="">Errore nel caricamento tipi</option>';
        }
    }
}

/**
 * Carica tutti gli spazi esistenti (ADMIN vede tutti gli spazi)
 */
async function loadSpaces() {
    const spacesGrid = document.getElementById('spaces-list');
    if (!spacesGrid) {
        return;
    }

    // Mostra stato di caricamento
    spacesGrid.innerHTML = '<div class="loading">Caricamento spazi...</div>';

    try {
        const response = await fetch('/api/admin/spaces', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Gestisci diversi formati di risposta API
        let spaces = [];
        if (data.data && data.data.items) {
            spaces = data.data.items;
        } else if (data.data && Array.isArray(data.data)) {
            spaces = data.data;
        } else if (data.items) {
            spaces = data.items;
        } else if (Array.isArray(data)) {
            spaces = data;
        } else if (data.data) {
            // Ispeziona tutte le proprietà di data.data
            for (const [key, value] of Object.entries(data.data)) {
                if (Array.isArray(value)) {
                    spaces = value;
                    break;
                }
            }
        }
        
        if (!spaces || spaces.length === 0) {
            spacesGrid.innerHTML = `
                <div class="empty-state">
                    <div class="material-symbols-outlined">work</div>
                    <p>Nessuno spazio configurato</p>
                    <p>Gli spazi vengono creati dai manager</p>
                </div>
            `;
            return;
        }

        // Renderizza gli spazi
        spacesGrid.innerHTML = '';
        spaces.forEach(space => {
            const spaceCard = createSpaceCard(space);
            spacesGrid.appendChild(spaceCard);
        });

    } catch (error) {
        console.error('Errore nel caricamento degli spazi:', error);
        spacesGrid.innerHTML = `
            <div class="empty-state">
                <p>Errore nel caricamento degli spazi</p>
                <button class="refresh-btn" onclick="loadSpaces()">Riprova</button>
            </div>
        `;
    }
}

/**
 * Filtra gli spazi in base al termine di ricerca
 */
function filterSpaces(searchTerm) {
    const spacesGrid = document.getElementById('spaces-list');
    if (!spacesGrid) return;
    
    const spaceItems = spacesGrid.querySelectorAll('.space-item');
    const normalizedSearch = searchTerm.toLowerCase().trim();
    
    // Rimuovi messaggio precedente se presente
    const existingMessage = spacesGrid.querySelector('.search-results-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    if (!normalizedSearch) {
        // Se la ricerca è vuota, mostra tutti gli spazi
        spaceItems.forEach(item => {
            item.style.display = 'block';
        });
        return;
    }
    
    let visibleCount = 0;
    spaceItems.forEach(item => {
        const itemText = item.textContent.toLowerCase();
        
        if (itemText.includes(normalizedSearch)) {
            item.style.display = 'block';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Mostra messaggio se nessun risultato
    if (visibleCount === 0) {
        showNoSpaceResultsMessage(searchTerm);
    }
}

/**
 * Mostra messaggio quando non ci sono risultati
 */
function showNoSpaceResultsMessage(searchTerm) {
    const spacesGrid = document.getElementById('spaces-list');
    if (!spacesGrid) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'search-results-message';
    messageDiv.style.textAlign = 'center';
    messageDiv.style.padding = '20px';
    messageDiv.style.color = '#666';
    messageDiv.style.fontSize = '16px';
    
    messageDiv.innerHTML = `
        <div style="color: #ff5722;">
            <strong>Nessun spazio trovato</strong><br>
            <span style="font-size: 14px; color: #999;">Prova con una ricerca diversa per "${searchTerm}"</span>
        </div>
    `;
    
    spacesGrid.appendChild(messageDiv);
}

/**
 * Crea un elemento lista per visualizzare uno spazio (formato admin)
 */
function createSpaceCard(space) {
    const div = document.createElement('div');
    div.className = 'space-item';
    
    const spaceId = space.space_id || space.id;
    
    div.innerHTML = `
        <div class="item-info">
            <div class="item-title">${space.name || space.space_name || 'Nome non disponibile'}</div>
            <div class="item-details">Location: ${space.location?.name || space.location_name || 'Location non specificata'}</div>
        </div>
        <div class="item-actions">
            <button class="edit-btn square-btn" data-space-id="${spaceId}" title="Modifica">
                <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="delete-btn square-btn" data-space-id="${spaceId}" title="Elimina">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
    `;
    
    // Aggiungi event listeners ai pulsanti
    const editBtn = div.querySelector('.edit-btn');
    const deleteBtn = div.querySelector('.delete-btn');
    
    editBtn.addEventListener('click', () => editSpace(spaceId));
    deleteBtn.addEventListener('click', () => deleteSpace(spaceId));
    
    return div;
}

/**
 * Apre il modal per creare un nuovo spazio
 */
function openCreateSpaceModal() {
    const modal = document.getElementById('space-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('space-form');
    
    if (modal && modalTitle && form) {
        modalTitle.textContent = 'Crea Nuovo Spazio';
        form.reset();
        
        // Imposta valori default per i nuovi campi
        document.getElementById('space-opening-time').value = '09:00';
        document.getElementById('space-closing-time').value = '18:00';
        
        // Seleziona Lunedì-Venerdì per default e aggiorna le classi CSS
        const dayCheckboxes = form.querySelectorAll('input[name="available_days"]');
        dayCheckboxes.forEach(checkbox => {
            const isDefaultSelected = ['1', '2', '3', '4', '5'].includes(checkbox.value);
            checkbox.checked = isDefaultSelected;
            
            const label = checkbox.closest('.day-checkbox');
            if (label) {
                if (isDefaultSelected) {
                    label.classList.add('checked');
                } else {
                    label.classList.remove('checked');
                }
            }
        });
        
        form.dataset.mode = 'create';
        delete form.dataset.spaceId;
        modal.style.display = 'block';
    }
}

/**
 * Apre il modal per modificare uno spazio esistente
 */
async function editSpace(spaceId) {
    try {
        const response = await fetch(`/api/admin/spaces/${spaceId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Gestisci diversi formati di risposta API
        let space = null;
        if (data.data && data.data.space) {
            space = data.data.space;
        } else if (data.data) {
            space = data.data;
        } else if (data.space) {
            space = data.space;
        } else {
            space = data;
        }
        
        const modal = document.getElementById('space-modal');
        const modalTitle = document.getElementById('space-modal-title');
        const form = document.getElementById('space-form');
        
        if (modal && modalTitle && form && space) {
            modalTitle.textContent = 'Modifica Spazio';
            
            // Prima carica le opzioni per i select
            await loadLocationsAndTypesForEdit(space);
            
            // Popola il form con i dati esistenti
            const nameField = document.getElementById('space-name');
            const descField = document.getElementById('space-description');
            const capacityField = document.getElementById('space-capacity');
            const rateField = document.getElementById('space-hourly-rate');
            const openingField = document.getElementById('space-opening-time');
            const closingField = document.getElementById('space-closing-time');
            
            if (nameField) nameField.value = space.name || space.space_name || '';
            if (descField) descField.value = space.description || '';
            if (capacityField) capacityField.value = space.capacity || '';
            if (rateField) rateField.value = space.hourly_rate || space.pricePerHour || space.price_per_hour || '';
            if (openingField) openingField.value = space.opening_time || space.openingTime || '09:00';
            if (closingField) closingField.value = space.closing_time || space.closingTime || '18:00';
            
            // Popola i giorni disponibili
            const dayCheckboxes = form.querySelectorAll('input[name="available_days"]');
            dayCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
                const label = checkbox.closest('.day-checkbox');
                if (label) {
                    label.classList.remove('checked');
                }
            });
            
            const availableDays = space.available_days || space.availableDays || [1, 2, 3, 4, 5];
            if (Array.isArray(availableDays)) {
                availableDays.forEach(day => {
                    const checkbox = form.querySelector(`input[name="available_days"][value="${day}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                        const label = checkbox.closest('.day-checkbox');
                        if (label) {
                            label.classList.add('checked');
                        }
                    }
                });
            } else {
                // Default: Lunedì-Venerdì se non specificato
                [1, 2, 3, 4, 5].forEach(day => {
                    const checkbox = form.querySelector(`input[name="available_days"][value="${day}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                        const label = checkbox.closest('.day-checkbox');
                        if (label) {
                            label.classList.add('checked');
                        }
                    }
                });
            }
            
            form.dataset.mode = 'edit';
            form.dataset.spaceId = spaceId;
            modal.style.display = 'block';
        }
    } catch (error) {
        console.error('Errore nel caricamento dello spazio:', error);
        alert('Errore nel caricamento dei dati dello spazio: ' + error.message);
    }
}

/**
 * Elimina uno spazio
 */
async function deleteSpace(spaceId) {
    if (!confirm('Sei sicuro di voler eliminare questo spazio? Questa azione non può essere annullata.')) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/spaces/${spaceId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        alert('Spazio eliminato con successo');
        loadSpaces(); // Ricarica la lista
    } catch (error) {
        console.error('Errore nell\'eliminazione dello spazio:', error);
        alert('Errore nell\'eliminazione dello spazio');
    }
}

/**
 * Chiude il modal
 */
function closeSpaceModal() {
    const modal = document.getElementById('space-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Gestisce l'invio del form per creare/modificare spazi
 */
async function handleSpaceFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const spaceData = Object.fromEntries(formData);
    
    // Converti i valori numerici
    spaceData.capacity = parseInt(spaceData.capacity);
    spaceData.price_per_hour = parseFloat(spaceData.hourly_rate);
    spaceData.price_per_day = parseFloat(spaceData.hourly_rate) * 8; // Calcola prezzo giornaliero
    spaceData.location_id = parseInt(spaceData.location_id);
    spaceData.space_type_id = parseInt(spaceData.space_type_id);
    spaceData.space_name = spaceData.name; // Mappa il nome
    
    // Rimuovi campi non necessari
    delete spaceData.hourly_rate;
    delete spaceData.name;
    
    // Gestisci i giorni disponibili
    const availableDaysCheckboxes = form.querySelectorAll('input[name="available_days"]:checked');
    spaceData.available_days = Array.from(availableDaysCheckboxes).map(cb => parseInt(cb.value));
    
    // Valida che almeno un giorno sia selezionato
    if (spaceData.available_days.length === 0) {
        alert('Seleziona almeno un giorno della settimana');
        return;
    }
    
    // Converti gli orari nel formato corretto (HH:MM:SS)
    if (spaceData.opening_time && !spaceData.opening_time.includes(':00', 5)) {
        spaceData.opening_time += ':00';
    }
    if (spaceData.closing_time && !spaceData.closing_time.includes(':00', 5)) {
        spaceData.closing_time += ':00';
    }
    
    // Valida gli orari
    const openingTime = spaceData.opening_time;
    const closingTime = spaceData.closing_time;
    
    if (openingTime >= closingTime) {
        alert('L\'orario di apertura deve essere precedente a quello di chiusura');
        return;
    }

    try {
        let response;
        
        if (form.dataset.mode === 'edit') {
            // Modifica spazio esistente
            const spaceId = parseInt(form.dataset.spaceId);
            response = await fetch(`/api/admin/spaces/${spaceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(spaceData)
            });
        } else {
            // Crea nuovo spazio (solo admin può creare spazi)
            response = await fetch('/api/admin/spaces', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(spaceData)
            });
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Spazio salvato:', result);

        if (form.dataset.mode === 'edit') {
            alert('Spazio modificato con successo');
        } else {
            alert('Spazio creato con successo');
        }

        closeSpaceModal();
        loadSpaces(); // Ricarica la lista
    } catch (error) {
        console.error('Errore nel salvataggio dello spazio:', error);
        alert('Errore nel salvataggio dello spazio: ' + (error.message || 'Errore sconosciuto'));
    }
}

// === GESTIONE PRENOTAZIONI ===

// Funzione per visualizzare le prenotazioni
function displayBookings(bookings, container) {
    // Crea una lista delle prenotazioni
    const bookingsList = document.createElement('div');
    bookingsList.className = 'bookings-list';
    
    bookings.forEach((booking, index) => {
        const bookingItem = document.createElement('div');
        bookingItem.className = 'booking-list-item';
        bookingItem.setAttribute('data-booking-id', booking.booking_id || booking.id);
        
        // Formatta le date
        const startDate = new Date(booking.start_datetime || booking.start_date);
        const endDate = new Date(booking.end_datetime || booking.end_date);
        const startDateStr = startDate.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric'
        });
        const endDateStr = endDate.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        // Ottieni il nome utente (da diversi campi possibili)
        const userName = booking.user_name || 
                       `${booking.user_first_name || ''} ${booking.user_last_name || ''}`.trim() ||
                       booking.customer_name ||
                       booking.user_email ||
                       'Utente non specificato';
        
        // Ottieni location e spazio
        const locationName = booking.location_name || booking.location || 'Location non specificata';
        const spaceName = booking.space_name || booking.space || 'Spazio non specificato';
        
        bookingItem.innerHTML = `
            <div class="booking-info">
                <div class="booking-user">
                    <strong>Utente:</strong> ${userName}
                </div>
                <div class="booking-location-space">
                    <strong>Location:</strong> ${locationName} - <strong>Spazio:</strong> ${spaceName}
                </div>
                <div class="booking-dates">
                    <strong>Dal:</strong> ${startDateStr} <strong>al:</strong> ${endDateStr}
                </div>
                <div class="booking-status">
                    <strong>Stato:</strong> ${booking.status || 'N/A'} | <strong>Importo:</strong> €${booking.total_amount || booking.total_price || '0.00'}
                </div>
            </div>
            <div class="booking-actions">
                <button class="delete-booking-btn square-btn" data-booking-id="${booking.booking_id || booking.id}" title="Elimina prenotazione">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        `;
        
        // Aggiungi event listener al pulsante elimina
        const deleteBtn = bookingItem.querySelector('.delete-booking-btn');
        deleteBtn.addEventListener('click', function() {
            const bookingId = this.getAttribute('data-booking-id');
            deleteBooking(bookingId);
        });
        
        bookingsList.appendChild(bookingItem);
    });
    
    container.appendChild(bookingsList);
}

function loadBookingsList() {
    const container = document.getElementById('bookings-list');
    
    if (!container) {
        return;
    }
    
    container.innerHTML = '<p>🔄 Caricamento prenotazioni...</p>';
    
    // Verifica token
    const token = localStorage.getItem('coworkspace_token');
    if (!token) {
        container.innerHTML = '<p style="color: red;">❌ Non sei autenticato. Effettua il login.</p>';
        return;
    }
    
    // Determina l'URL base
    fetch('https://coworkspace-fxyv.onrender.com/api/admin/bookings', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
        .then(res => {
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error(`API endpoint non trovato (404): ${apiUrl}`);
                } else if (res.status === 401) {
                    throw new Error(`Non autorizzato (401): Token non valido o scaduto`);
                } else if (res.status === 403) {
                    throw new Error(`Accesso negato (403): Permessi insufficienti`);
                } else if (res.status >= 500) {
                    throw new Error(`Errore server (${res.status}): Problema interno del server`);
                } else {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
            }
            return res.json();
        })
        .then(data => {
            container.innerHTML = '';
            
            // Gestisci diversi formati di risposta API
            let bookings = [];
            if (data.success === false) {
                throw new Error(data.message || data.error || 'API ha restituito un errore');
            }
            
            // Gestione specifica per il formato ricevuto
            if (data.success === true && data.data) {
                // Prova tutti i possibili formati all'interno di data.data
                if (data.data.bookings && Array.isArray(data.data.bookings)) {
                    bookings = data.data.bookings;
                } else if (data.data.items && Array.isArray(data.data.items)) {
                    bookings = data.data.items;
                } else if (Array.isArray(data.data)) {
                    bookings = data.data;
                } else {
                    // Cerca il primo array nelle proprietà di data.data
                    for (const [key, value] of Object.entries(data.data)) {
                        if (Array.isArray(value)) {
                            bookings = value;
                            break;
                        }
                    }
                }
            } else if (Array.isArray(data)) {
                bookings = data;
            } else if (data.bookings && Array.isArray(data.bookings)) {
                bookings = data.bookings;
            }
            
            if (bookings.length === 0) {
                container.innerHTML = '<p>Nessuna prenotazione trovata.</p>';
                return;
            }
            
            displayBookings(bookings, container);
            
        })
        .catch(error => {
            container.innerHTML = `<p style="color: red;">❌ Errore nel caricamento: ${error.message}</p>`;
        });
}

// Funzione per caricare dati di test quando l'API non funziona
function loadTestBookingsData() {
    const container = document.getElementById('bookings-list');
    
    if (!container) {
        console.error('❌ Container bookings-list non trovato per i test!');
        return;
    }
    
    // Dati di test
    const testBookings = [
        {
            booking_id: 1,
            user_name: 'Mario Rossi',
            user_email: 'mario.rossi@example.com',
            location_name: 'CoWork Milano Centro',
            space_name: 'Sala Riunioni A',
            start_date: '2024-12-20',
            end_date: '2024-12-20',
            status: 'confirmed',
            total_amount: '75.00'
        },
        {
            booking_id: 2,
            user_name: 'Giulia Bianchi',
            user_email: 'giulia.bianchi@example.com',
            location_name: 'CoWork Roma EUR',
            space_name: 'Postazione Desk 12',
            start_date: '2024-12-15',
            end_date: '2024-12-17',
            status: 'confirmed',
            total_amount: '150.00'
        },
        {
            booking_id: 3,
            user_name: 'Luca Verdi',
            user_email: 'luca.verdi@example.com',
            location_name: 'CoWork Torino',
            space_name: 'Ufficio Privato 3',
            start_date: '2024-12-10',
            end_date: '2024-12-12',
            status: 'completed',
            total_amount: '200.00'
        }
    ];
    
    container.innerHTML = '';
    
    // Crea una lista delle prenotazioni di test
    const bookingsList = document.createElement('div');
    bookingsList.className = 'bookings-list';
    
    testBookings.forEach((booking, index) => {
        const bookingItem = document.createElement('div');
        bookingItem.className = 'booking-list-item';
        
        // Formatta le date
        const startDate = new Date(booking.start_date);
        const endDate = new Date(booking.end_date);
        const startDateStr = startDate.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric'
        });
        const endDateStr = endDate.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        bookingItem.innerHTML = `
            <div class="booking-info">
                <div class="booking-user">
                    <strong>Utente:</strong> ${booking.user_name}
                </div>
                <div class="booking-location-space">
                    <strong>Location:</strong> ${booking.location_name} - <strong>Spazio:</strong> ${booking.space_name}
                </div>
                <div class="booking-dates">
                    <strong>Dal:</strong> ${startDateStr} <strong>al:</strong> ${endDateStr}
                </div>
                <div class="booking-status">
                    <strong>Stato:</strong> ${booking.status} | <strong>Importo:</strong> €${booking.total_amount}
                </div>
            </div>
            <div class="booking-actions">
                <button class="delete-booking-btn square-btn" data-booking-id="${booking.booking_id}" title="Elimina prenotazione">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        `;
        
        // Aggiungi event listener al pulsante elimina
        const deleteBtn = bookingItem.querySelector('.delete-booking-btn');
        deleteBtn.addEventListener('click', function() {
            const bookingId = this.getAttribute('data-booking-id');
            if (confirm('Sei sicuro di voler eliminare questa prenotazione di test? (Solo per demo)')) {
                // Per i dati di test, rimuovi semplicemente l'elemento
                bookingItem.remove();
                showMessage('Prenotazione di test eliminata!', 'success');
            }
        });
        
        bookingsList.appendChild(bookingItem);
    });
    
    container.appendChild(bookingsList);
}

function deleteBooking(bookingId) {
    if (!confirm('Sei sicuro di voler eliminare questa prenotazione?')) {
        return;
    }
    
    async function performDelete() {
        try {
            const response = await fetch(`https://coworkspace-fxyv.onrender.com/api/bookings/${bookingId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                // Rimuovi la riga dalla tabella
                const bookingRow = document.querySelector(`[data-booking-id="${bookingId}"]`);
                if (bookingRow) {
                    bookingRow.style.transition = 'opacity 0.3s ease';
                    bookingRow.style.opacity = '0';
                    setTimeout(() => {
                        bookingRow.remove();
                    }, 300);
                }
                
                showMessage('Prenotazione eliminata con successo', 'success');
            } else {
                throw new Error(`Errore ${response.status}: ${response.statusText}`);
            }
            
        } catch (error) {
            showMessage(`Errore nell'eliminazione: ${error.message}`, 'error');
        }
    }
    
    performDelete();
}

// === FUNZIONI HELPER ===
async function loadLocationsAndTypesForEdit(space) {
    try {
        // Carica le location
    const locationsResponse = await fetch('https://coworkspace-fxyv.onrender.com/api/admin/locations', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`
            }
        });
        const locationsData = await locationsResponse.json();
        
        // Carica i tipi di spazio
    const typesResponse = await fetch('https://coworkspace-fxyv.onrender.com/api/space-types', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`
            }
        });
        const typesData = await typesResponse.json();
        
        // Popola il select delle location
        const locationSelect = document.getElementById('space-location');
        if (locationSelect) {
            locationSelect.innerHTML = '<option value="">Seleziona una location</option>';
            
            let locations = [];
            if (locationsData.data && locationsData.data.locations) {
                locations = locationsData.data.locations;
            } else if (locationsData.data && Array.isArray(locationsData.data)) {
                locations = locationsData.data;
            } else if (locationsData.data) {
                // Cerca array nelle proprietà di data.data
                for (const [key, value] of Object.entries(locationsData.data)) {
                    if (Array.isArray(value)) {
                        locations = value;
                        break;
                    }
                }
            }
            
            locations.forEach(location => {
                const locationId = location.location_id || location.id;
                const locationName = location.name || location.location_name || 'Nome non disponibile';
                locationSelect.innerHTML += `<option value="${locationId}">${locationName}</option>`;
            });
            
            // Imposta il valore selezionato
            const spaceLocationId = space.location_id || space.locationId;
            if (spaceLocationId) {
                locationSelect.value = spaceLocationId;
                // Rendi la location non modificabile in modalità edit
                locationSelect.disabled = true;
                locationSelect.style.backgroundColor = '#f5f5f5';
                locationSelect.style.cursor = 'not-allowed';
            }
        }
        
        // Popola il select dei tipi di spazio
        const typeSelect = document.getElementById('space-type');
        if (typeSelect) {
            typeSelect.innerHTML = '<option value="">Seleziona un tipo</option>';
            
            let types = [];
            if (typesData.data && typesData.data.spaceTypes) {
                types = typesData.data.spaceTypes;
            } else if (typesData.data && Array.isArray(typesData.data)) {
                types = typesData.data;
            } else if (typesData.data) {
                // Cerca array nelle proprietà di data.data
                for (const [key, value] of Object.entries(typesData.data)) {
                    if (Array.isArray(value)) {
                        types = value;
                        break;
                    }
                }
            } else if (Array.isArray(typesData)) {
                types = typesData;
            }
            
            types.forEach(type => {
                const typeId = type.space_type_id || type.id;
                // Prova diversi campi per il nome
                const typeName = type.name || type.type_name || type.space_type_name || type.description || 'Nome non disponibile';
                typeSelect.innerHTML += `<option value="${typeId}">${typeName}</option>`;
            });
            
            // Imposta il valore selezionato
            const spaceTypeId = space.space_type_id || space.spaceTypeId;
            if (spaceTypeId) {
                typeSelect.value = spaceTypeId;
            }
        }
        
    } catch (error) {
        console.error('Errore nel caricamento delle opzioni:', error);
    }
}

function loadLocationsForSelect() {
    fetch('https://coworkspace-fxyv.onrender.com/api/admin/locations', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`
        }
    })
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('space-location');
            select.innerHTML = '<option value="">Seleziona una location</option>';
            
            if (data.success && data.data) {
                data.data.forEach(location => {
                    select.innerHTML += `<option value="${location.location_id}">${location.name}</option>`;
                });
            }
        })
        .catch(err => console.error('Errore caricamento location:', err));
}

function loadSpaceTypesForSelect() {
    fetch('https://coworkspace-fxyv.onrender.com/api/admin/space-types', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`
        }
    })
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('space-type');
            select.innerHTML = '<option value="">Seleziona un tipo</option>';
            
            if (data.success && data.data) {
                data.data.forEach(type => {
                    select.innerHTML += `<option value="${type.space_type_id}">${type.name}</option>`;
                });
            }
        })
        .catch(err => console.error('Errore caricamento tipi spazio:', err));
}

// === SETUP MODAL EVENT LISTENERS ===
function setupModalEventListeners() {
    // Chiusura modal
    document.getElementById('close-location-modal').addEventListener('click', () => {
        document.getElementById('location-modal').style.display = 'none';
    });
    
    document.getElementById('close-space-modal').addEventListener('click', () => {
        document.getElementById('space-modal').style.display = 'none';
    });
    
    // Chiusura cliccando fuori dal modal
    window.addEventListener('click', (event) => {
        const locationModal = document.getElementById('location-modal');
        const spaceModal = document.getElementById('space-modal');
        
        if (event.target === locationModal) {
            locationModal.style.display = 'none';
        }
        if (event.target === spaceModal) {
            spaceModal.style.display = 'none';
        }
    });
    
    // Submit forms - ora gestiti dai pulsanti esterni
    document.getElementById('save-location-btn').addEventListener('click', () => {
        document.getElementById('location-form').dispatchEvent(new Event('submit'));
    });
    
    document.getElementById('save-space-btn').addEventListener('click', () => {
        document.getElementById('space-form').dispatchEvent(new Event('submit'));
    });
    
    document.getElementById('location-form').addEventListener('submit', handleLocationSubmit);
    document.getElementById('space-form').addEventListener('submit', handleSpaceSubmit);
    
    // Cancel buttons
    document.getElementById('cancel-location-form').addEventListener('click', () => {
        document.getElementById('location-modal').style.display = 'none';
    });
    
    document.getElementById('cancel-space-form').addEventListener('click', () => {
        document.getElementById('space-modal').style.display = 'none';
    });
}

function handleLocationSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const form = e.target;
    const locationId = form.dataset.locationId;
    
    const locationData = {
        name: formData.get('name'),
        description: formData.get('description'),
        address: formData.get('address'),
        city: formData.get('city')
    };
    
    const url = locationId ? `/api/admin/locations/${locationId}` : '/api/admin/locations';
    const method = locationId ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(locationData)
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const action = locationId ? 'modificata' : 'creata';
                showMessage(`Location ${action} con successo!`, 'success');
                document.getElementById('location-modal').style.display = 'none';
                loadLocationsList();
            } else {
                const action = locationId ? 'modifica' : 'creazione';
                showMessage(`Errore nella ${action} della location`, 'error');
            }
        })
        .catch(err => {
            console.error('Errore nella gestione location:', err);
            const action = locationId ? 'modifica' : 'creazione';
            showMessage(`Errore nella ${action} della location`, 'error');
        });
}

function handleSpaceSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const form = e.target;
    const spaceId = form.dataset.spaceId;
    const availableDays = Array.from(formData.getAll('available_days'));
    
    const spaceData = {
        name: formData.get('name'),
        description: formData.get('description'),
        location_id: formData.get('location_id'),
        space_type_id: formData.get('space_type_id'),
        capacity: parseInt(formData.get('capacity')),
        hourly_rate: parseFloat(formData.get('hourly_rate')),
        available_days: availableDays,
        opening_time: formData.get('opening_time'),
        closing_time: formData.get('closing_time')
    };
    
    const url = spaceId ? `/api/admin/spaces/${spaceId}` : '/api/admin/spaces';
    const method = spaceId ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('coworkspace_token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(spaceData)
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const action = spaceId ? 'modificato' : 'creato';
                showMessage(`Spazio ${action} con successo!`, 'success');
                document.getElementById('space-modal').style.display = 'none';
                loadSpaces();
            } else {
                const action = spaceId ? 'modifica' : 'creazione';
                showMessage(`Errore nella ${action} dello spazio`, 'error');
            }
        })
        .catch(err => {
            console.error('Errore nella gestione spazio:', err);
            const action = spaceId ? 'modifica' : 'creazione';
            showMessage(`Errore nella ${action} dello spazio`, 'error');
        });
}

// Funzioni globali per i pulsanti nelle card
window.editSpace = editSpace;
window.deleteSpace = deleteSpace;
window.editLocation = editLocation;
window.deleteLocation = deleteLocation;
window.loadLocationsList = loadLocationsList;
window.loadSpaces = loadSpaces;
window.loadBookingsList = loadBookingsList;
window.loadTestBookingsData = loadTestBookingsData;
