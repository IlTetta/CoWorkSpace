// Dashboard-Manager.js - Gestisce le funzionalità della pagina dashboard manager

document.addEventListener('DOMContentLoaded', function() {
    // Verifica se l'utente è autenticato
    const token = localStorage.getItem('coworkspace_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    // Inizializza i gestori dei pulsanti
    initializeButtons();
    // Inizializza il gestore per il caricamento dell'immagine del profilo
    initializeProfileImageUpload();
    // Carica l'immagine del profilo salvata (se presente)
    loadSavedProfileImage();
    // Carica e popola le informazioni utente manager
    loadAndPopulateManagerInfo();
    // Inizializza la gestione delle location
    initializeLocationManagement();
    // Inizializza la gestione degli spazi
    initializeWorkspaceManagement();
});

/**
 * Inizializza i gestori degli eventi per i pulsanti
 */
function initializeButtons() {
    // Gestore per il pulsante Home
    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) {
        homeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Reindirizza alla pagina home
            window.location.href = 'home.html';
        });
    }

    // Gestore per il pulsante Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Conferma logout
            if (confirm('Sei sicuro di voler effettuare il logout?')) {
                performLogout();
            }
        });
    }
}

/**
 * Esegue il logout dell'utente
 */
function performLogout() {
    try {
        // Usa authService se disponibile
        if (window.authService) {
            window.authService.logout();
        } else {
            // Fallback: rimuovi token manualmente e reindirizza
            localStorage.removeItem('coworkspace_token');
            localStorage.removeItem('coworkspace_user');
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Errore durante il logout:', error);
        // Fallback in caso di errore
        localStorage.removeItem('coworkspace_token');
        localStorage.removeItem('coworkspace_user');
        window.location.href = 'login.html';
    }
}

/**
 * Inizializza il gestore per il caricamento dell'immagine del profilo
 */
function initializeProfileImageUpload() {
    const profileIconContainer = document.getElementById('profile-icon-container');
    const profileImageInput = document.getElementById('profile-image-input');
    const contextMenu = document.getElementById('profile-context-menu');
    const changeImageBtn = document.getElementById('change-image');
    const removeImageBtn = document.getElementById('remove-image');

    if (profileIconContainer && profileImageInput && contextMenu) {
        // Gestore per il click sinistro sull'icona del profilo
        profileIconContainer.addEventListener('click', function(e) {
            // Se non c'è un'immagine caricata, apri direttamente il selettore
            const profileImage = document.getElementById('profile-image');
            if (profileImage.style.display === 'none') {
                profileImageInput.click();
            }
        });

        // Gestore per il click destro sull'icona del profilo
        profileIconContainer.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            const profileImage = document.getElementById('profile-image');
            
            // Mostra il menu contestuale solo se c'è un'immagine caricata
            if (profileImage.style.display !== 'none') {
                showContextMenu(e, contextMenu);
            } else {
                // Se non c'è immagine, apri direttamente il selettore
                profileImageInput.click();
            }
        });

        // Gestore per "Cambia immagine"
        if (changeImageBtn) {
            changeImageBtn.addEventListener('click', function() {
                hideContextMenu(contextMenu);
                profileImageInput.click();
            });
        }

        // Gestore per "Rimuovi immagine"
        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', function() {
                hideContextMenu(contextMenu);
                removeProfileImage();
            });
        }

        // Gestore per quando viene selezionato un file
        profileImageInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                handleProfileImageUpload(file);
            }
        });

        // Nasconde il menu contestuale quando si clicca fuori
        document.addEventListener('click', function() {
            hideContextMenu(contextMenu);
        });
    }
}

/**
 * Gestisce il caricamento dell'immagine del profilo
 */
function handleProfileImageUpload(file) {
    // Verifica che sia un'immagine
    if (!file.type.startsWith('image/')) {
        alert('Per favore seleziona un file immagine valido.');
        return;
    }

    // Verifica la dimensione del file (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('L\'immagine è troppo grande. Seleziona un\'immagine più piccola di 5MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const imageDataUrl = e.target.result;
        displayProfileImage(imageDataUrl);
        saveProfileImage(imageDataUrl);
    };
    reader.readAsDataURL(file);
}

/**
 * Mostra l'immagine del profilo caricata
 */
function displayProfileImage(imageDataUrl) {
    const defaultIcon = document.getElementById('default-icon');
    const profileImage = document.getElementById('profile-image');

    if (defaultIcon && profileImage) {
        defaultIcon.style.display = 'none';
        profileImage.src = imageDataUrl;
        profileImage.style.display = 'block';
    }
}

/**
 * Salva l'immagine del profilo nel localStorage
 */
function saveProfileImage(imageDataUrl) {
    try {
        localStorage.setItem('manager_profile_image', imageDataUrl);
        console.log('Immagine del profilo manager salvata');
    } catch (error) {
        console.error('Errore nel salvare l\'immagine del profilo manager:', error);
        alert('Errore nel salvare l\'immagine. Potrebbe essere troppo grande.');
    }
}

/**
 * Carica l'immagine del profilo salvata
 */
function loadSavedProfileImage() {
    try {
        const savedImage = localStorage.getItem('manager_profile_image');
        if (savedImage) {
            displayProfileImage(savedImage);
        }
    } catch (error) {
        console.error('Errore nel caricare l\'immagine del profilo manager:', error);
    }
}

/**
 * Mostra il menu contestuale
 */
function showContextMenu(event, contextMenu) {
    const rect = event.currentTarget.getBoundingClientRect();
    contextMenu.style.display = 'block';
    contextMenu.style.left = (rect.left + 180) + 'px';
    contextMenu.style.top = rect.top + 'px';
}

/**
 * Nasconde il menu contestuale
 */
function hideContextMenu(contextMenu) {
    contextMenu.style.display = 'none';
}

/**
 * Rimuove l'immagine del profilo
 */
function removeProfileImage() {
    const defaultIcon = document.getElementById('default-icon');
    const profileImage = document.getElementById('profile-image');

    if (defaultIcon && profileImage) {
        // Mostra l'icona predefinita
        defaultIcon.style.display = 'block';
        // Nasconde l'immagine del profilo
        profileImage.style.display = 'none';
        profileImage.src = '';
        
        // Rimuove l'immagine dal localStorage
        try {
            localStorage.removeItem('manager_profile_image');
            console.log('Immagine del profilo manager rimossa');
        } catch (error) {
            console.error('Errore nella rimozione dell\'immagine del profilo manager:', error);
        }
    }
}

/**
 * Ottiene i dati dell'utente dal localStorage
 */
function getUserData() {
    try {
        const userString = localStorage.getItem('coworkspace_user');
        return userString ? JSON.parse(userString) : null;
    } catch (error) {
        console.error('Errore nel recuperare i dati utente manager:', error);
        return null;
    }
}

/**
 * Popola automaticamente le informazioni manager nelle card della pagina
 */
function populateManagerInfoDisplay() {
    const user = getUserData();
    if (!user) {
        console.log('Nessun dato utente manager trovato');
        return;
    }

    // Verifica che l'utente sia effettivamente un manager
    if (user.role !== 'manager') {
        console.warn('L\'utente non ha il ruolo di manager');
        window.location.href = 'home.html';
        return;
    }

    // Popola i campi con i dati dell'utente usando textContent
    const nameSpan = document.getElementById('display-name');
    const surnameSpan = document.getElementById('display-surname');
    const emailSpan = document.getElementById('display-email');
    const roleSpan = document.getElementById('display-role');
    const registrationSpan = document.getElementById('display-registration');

    if (nameSpan) nameSpan.textContent = user.name || 'N/A';
    if (surnameSpan) surnameSpan.textContent = user.surname || 'N/A';
    if (emailSpan) emailSpan.textContent = user.email || 'N/A';
    
    // Ruolo specifico per manager
    if (roleSpan) roleSpan.textContent = 'Manager';
    
    // Formatta la data di registrazione
    if (registrationSpan) {
        if (user.created_at) {
            const date = new Date(user.created_at);
            const formattedDate = date.toLocaleDateString('it-IT', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            registrationSpan.textContent = formattedDate;
        } else {
            registrationSpan.textContent = 'N/A';
        }
    }
}

/**
 * Carica le informazioni manager dal server e le popola nella pagina
 */
async function loadAndPopulateManagerInfo() {
    try {
        // Controlla se abbiamo un token
        const token = localStorage.getItem('coworkspace_token');
        
        console.log('Token presente:', !!token);
        
        if (!token) {
            console.error('Nessun token trovato, reindirizzo al login');
            window.location.href = 'login.html';
            return;
        }

        // Recupera i dati dal server
        if (window.apiService && typeof window.apiService.getCurrentUser === 'function') {
            console.log('Tentativo di recuperare dati utente corrente...');
            const userResponse = await window.apiService.getCurrentUser();
            
            console.log('Risposta getCurrentUser:', userResponse);
            
            if (userResponse) {
                console.log('Ruolo utente ricevuto:', userResponse.role);
                
                // Verifica che l'utente sia un manager
                if (userResponse.role !== 'manager') {
                    console.error('Accesso negato: l\'utente non è un manager, ruolo:', userResponse.role);
                    alert('Accesso negato. Solo i manager possono accedere a questa pagina.');
                    window.location.href = 'home.html';
                    return;
                }
                
                console.log('Utente manager confermato:', userResponse.name, userResponse.surname);
                
                // Salva i dati aggiornati nel localStorage
                localStorage.setItem('coworkspace_user', JSON.stringify(userResponse));
                // Popola la pagina con i dati del server
                populateManagerInfoDisplay();
                return;
            } else {
                console.error('getCurrentUser ha restituito dati vuoti');
            }
        } else {
            console.error('apiService non disponibile o getCurrentUser non è una funzione');
        }

        // Fallback: usa i dati dal localStorage se disponibili
        const user = getUserData();
        if (user && user.role !== 'manager') {
            console.error('Accesso negato: l\'utente localStorage non è un manager');
            alert('Accesso negato. Solo i manager possono accedere a questa pagina.');
            window.location.href = 'home.html';
            return;
        }
        
        console.log('Usando dati localStorage come fallback');
        populateManagerInfoDisplay();
        
    } catch (error) {
        console.error('Errore nel caricare le informazioni manager dal server:', error);
        console.error('Status:', error.status);
        console.error('Message:', error.message);
        
        // Se è un errore 403, potrebbe essere un problema di autenticazione
        if (error.status === 403) {
            console.error('Errore 403 - Token probabilmente scaduto o non valido');
            alert('Sessione scaduta. Effettua nuovamente il login.');
            localStorage.removeItem('coworkspace_token');
            localStorage.removeItem('coworkspace_user');
            window.location.href = 'login.html';
            return;
        }
        
        // In caso di errore, usa i dati dal localStorage
        populateManagerInfoDisplay();
    }
}

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

    if (createLocationBtn) {
        createLocationBtn.addEventListener('click', openCreateLocationModal);
    }

    if (refreshLocationsBtn) {
        refreshLocationsBtn.addEventListener('click', loadManagerLocations);
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
    loadManagerLocations();
    
    // Forza il caricamento delle location dopo un breve delay per assicurarsi che il DOM sia pronto
    setTimeout(() => {
        console.log('Forcing loadManagerLocations after timeout');
        loadManagerLocations();
    }, 500);
}

/**
 * Carica le location gestite dal manager
 */
async function loadManagerLocations() {
    console.log('loadManagerLocations() chiamata');
    const locationsGrid = document.getElementById('locations-grid');
    if (!locationsGrid) {
        console.log('Elemento locations-grid non trovato!');
        return;
    }

    console.log('Elemento locations-grid trovato');
    
    // Mostra stato di caricamento
    locationsGrid.innerHTML = '<div class="loading">Caricamento location...</div>';

    try {
        if (!window.apiService) {
            throw new Error('ApiService non disponibile');
        }

        console.log('Tentativo di chiamare API getMyLocations...');
        const locations = await window.apiService.getMyLocations();
        console.log('API chiamata con successo, location caricate:', locations ? locations.length : 0);
        console.log('Dati location ricevuti:', locations);
        
        if (!locations || locations.length === 0) {
            locationsGrid.innerHTML = `
                <div class="empty-state">
                    <div class="material-symbols-outlined">location_on</div>
                    <p>Nessuna location configurata</p>
                    <p>Aggiungi la prima location per iniziare</p>
                </div>
            `;
            return;
        }

        // Renderizza le location
        locationsGrid.innerHTML = '';
        locations.forEach(location => {
            console.log('Creando card per location:', location.name);
            const locationCard = createLocationCard(location);
            locationsGrid.appendChild(locationCard);
        });

    } catch (error) {
        console.error('Errore nel caricamento delle location:', error);
        console.error('Status code:', error.status);
        console.error('Error message:', error.message);
        
        // Se è un errore 403, gestiscilo specificamente
        if (error.status === 403) {
            console.error('Errore 403 su getMyLocations - problema di autorizzazione');
            locationsGrid.innerHTML = `
                <div class="empty-state">
                    <p>Errore di autorizzazione</p>
                    <p>Verifica di essere loggato come manager</p>
                    <button class="refresh-btn" onclick="window.location.href='login.html'">Vai al Login</button>
                </div>
            `;
        } else {
            locationsGrid.innerHTML = `
                <div class="empty-state">
                    <p>Errore nel caricamento delle location</p>
                    <button class="refresh-btn" onclick="loadManagerLocations()">Riprova</button>
                </div>
            `;
        }
    }
}

/**
 * Filtra le location in base al termine di ricerca
 */
function filterLocations(searchTerm) {
    const locationsGrid = document.getElementById('locations-grid');
    if (!locationsGrid) return;
    
    const locationCards = locationsGrid.querySelectorAll('.location-card');
    const normalizedSearch = searchTerm.toLowerCase().trim();
    
    // Rimuovi messaggio precedente se presente
    const existingMessage = locationsGrid.querySelector('.search-results-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    if (!normalizedSearch) {
        // Se la ricerca è vuota, mostra tutte le location
        locationCards.forEach(card => {
            card.style.display = 'block';
        });
        return;
    }
    
    let visibleCount = 0;
    locationCards.forEach(card => {
        const locationName = card.querySelector('.location-name')?.textContent.toLowerCase() || '';
        const locationCity = card.querySelector('.location-city')?.textContent.toLowerCase() || '';
        const locationAddress = card.querySelector('.location-address')?.textContent.toLowerCase() || '';
        const locationDescription = card.querySelector('.location-description')?.textContent.toLowerCase() || '';
        
        const isMatch = locationName.includes(normalizedSearch) ||
                       locationCity.includes(normalizedSearch) ||
                       locationAddress.includes(normalizedSearch) ||
                       locationDescription.includes(normalizedSearch);
        
        if (isMatch) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
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
    const locationsGrid = document.getElementById('locations-grid');
    if (!locationsGrid) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'search-results-message';
    messageDiv.style.gridColumn = '1 / -1';
    messageDiv.style.textAlign = 'center';
    messageDiv.style.padding = '40px 20px';
    messageDiv.style.color = '#666';
    messageDiv.style.fontSize = '18px';
    
    messageDiv.innerHTML = `
        <div style="color: #ff5722;">
            <span class="material-symbols-outlined" style="font-size: 48px; display: block; margin-bottom: 10px;">search_off</span>
            <strong>Nessuna location trovata</strong><br>
            <span style="font-size: 16px; color: #999;">Prova con una ricerca diversa per "${searchTerm}"</span>
        </div>
    `;
    
    locationsGrid.appendChild(messageDiv);
}

/**
 * Crea una card per visualizzare una location
 */
function createLocationCard(location) {
    const card = document.createElement('div');
    card.className = 'location-card';
    
    // Genera un colore pastello casuale per l'header
    const hue = Math.floor(Math.random() * 360);
    const randomColor = `hsl(${hue}, 65%, 85%)`;
    
    card.innerHTML = `
        <div class="location-name" style="--random-color: ${randomColor}">
            ${location.name || location.location_name || 'Nome non disponibile'}
            <div class="location-actions">
                <button class="action-button edit-btn" onclick="editLocation(${location.location_id || location.id})" title="Modifica">
                    <span class="material-symbols-outlined">edit</span>
                </button>
                <button class="action-button delete-btn" onclick="deleteLocation(${location.location_id || location.id})" title="Elimina">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        </div>
        <div class="location-info">
            <div class="location-city-address">
                <span class="location-city">${location.city || 'Città non specificata'}</span>
                <span class="location-address">, ${location.address || 'Indirizzo non disponibile'}</span>
            </div>
            <div class="location-description">${location.description || 'Nessuna descrizione disponibile'}</div>
        </div>
    `;
    
    return card;
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
        if (!window.apiService) return;
        
        const location = await window.apiService.getLocationById(locationId);
        const modal = document.getElementById('location-modal');
        const modalTitle = document.getElementById('location-modal-title');
        const form = document.getElementById('location-form');
        
        if (modal && modalTitle && form && location) {
            modalTitle.textContent = 'Modifica Location';
            
            // Popola il form con i dati esistenti
            document.getElementById('location-name').value = location.name || location.location_name || '';
            document.getElementById('location-description').value = location.description || '';
            document.getElementById('location-address').value = location.address || '';
            document.getElementById('location-city').value = location.city || '';
            
            form.dataset.mode = 'edit';
            form.dataset.locationId = locationId;
            modal.style.display = 'block';
        }
    } catch (error) {
        console.error('Errore nel caricamento della location:', error);
        alert('Errore nel caricamento dei dati della location');
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
        if (!window.apiService) return;
        
        await window.apiService.deleteLocation(locationId);
        alert('Location eliminata con successo');
        loadManagerLocations(); // Ricarica la lista
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
    
    // Converti i valori necessari
    locationData.location_name = locationData.name; // Mappa il nome
    
    // Rimuovi campi non necessari
    delete locationData.name;

    // Aggiungi automaticamente l'ID del manager loggato per le nuove location
    if (form.dataset.mode === 'create') {
        const user = getUserData();
        if (user && user.user_id) {
            locationData.manager_id = user.user_id;
        }
    }

    try {
        if (!window.apiService) {
            throw new Error('ApiService non disponibile');
        }

        if (form.dataset.mode === 'edit') {
            // Modifica location esistente
            const locationId = parseInt(form.dataset.locationId);
            await window.apiService.updateLocation(locationId, locationData);
            alert('Location modificata con successo');
        } else {
            // Crea nuova location
            await window.apiService.createLocation(locationData);
            alert('Location creata con successo');
        }

        closeLocationModal();
        loadManagerLocations(); // Ricarica la lista delle location
        loadLocations(); // Ricarica anche la lista nel form degli spazi
    } catch (error) {
        console.error('Errore nel salvataggio della location:', error);
        alert('Errore nel salvataggio della location: ' + (error.message || 'Errore sconosciuto'));
    }
}

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

    if (createSpaceBtn) {
        createSpaceBtn.addEventListener('click', openCreateSpaceModal);
    }

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
    
    // Forza il caricamento degli spazi dopo un breve delay per assicurarsi che il DOM sia pronto
    setTimeout(() => {
        console.log('Forcing loadSpaces after timeout');
        loadSpaces();
    }, 500);
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
 * Carica tutte le location disponibili
 */
async function loadLocations() {
    try {
        if (!window.apiService) return;
        
        const locations = await window.apiService.getMyLocations();
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
        if (!window.apiService) return;
        
        const spaceTypes = await window.apiService.getAllSpaceTypes();
        const spaceTypeSelect = document.getElementById('space-type');
        
        if (spaceTypeSelect && spaceTypes) {
            spaceTypeSelect.innerHTML = '<option value="">Seleziona un tipo</option>';
            spaceTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.space_type_id || type.id;
                option.textContent = type.type_name || type.name;
                spaceTypeSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Errore nel caricamento dei tipi di spazio:', error);
    }
}

/**
 * Carica tutti gli spazi esistenti
 */
async function loadSpaces() {
    console.log('loadSpaces() chiamata');
    const spacesGrid = document.getElementById('spaces-grid');
    if (!spacesGrid) {
        console.log('Elemento spaces-grid non trovato!');
        return;
    }

    console.log('Elemento spaces-grid trovato');
    
    // Mostra stato di caricamento
    spacesGrid.innerHTML = '<div class="loading">Caricamento spazi...</div>';

    try {
        if (!window.apiService) {
            throw new Error('ApiService non disponibile');
        }

        console.log('Tentativo di chiamare API getAllSpaces...');
        const spaces = await window.apiService.getAllSpaces();
        console.log('API chiamata con successo, spazi caricati:', spaces ? spaces.length : 0);
        console.log('Dati spazi ricevuti:', spaces);
        
        if (!spaces || spaces.length === 0) {
            spacesGrid.innerHTML = `
                <div class="empty-state">
                    <div class="material-symbols-outlined">work</div>
                    <p>Nessuno spazio configurato</p>
                    <p>Crea il primo spazio per iniziare</p>
                </div>
            `;
            return;
        }

        // Renderizza gli spazi
        spacesGrid.innerHTML = '';
        spaces.forEach(space => {
            console.log('Creando card per spazio:', space.name);
            const spaceCard = createSpaceCard(space);
            spacesGrid.appendChild(spaceCard);
        });

    } catch (error) {
        console.error('Errore nel caricamento degli spazi:', error);
        console.error('Status code:', error.status);
        console.error('Error message:', error.message);
        
        // Se è un errore 403, gestiscilo specificamente
        if (error.status === 403) {
            console.error('Errore 403 su getAllSpaces - problema di autorizzazione');
            spacesGrid.innerHTML = `
                <div class="empty-state">
                    <p>Errore di autorizzazione</p>
                    <p>Verifica di essere loggato come manager</p>
                    <button class="refresh-btn" onclick="window.location.href='login.html'">Vai al Login</button>
                </div>
            `;
        } else {
            spacesGrid.innerHTML = `
                <div class="empty-state">
                    <p>Errore nel caricamento degli spazi</p>
                    <button class="refresh-btn" onclick="loadSpaces()">Riprova</button>
                </div>
            `;
        }
    }
}

/**
 * Filtra gli spazi in base al termine di ricerca
 */
function filterSpaces(searchTerm) {
    const spacesGrid = document.getElementById('spaces-grid');
    if (!spacesGrid) return;
    
    const spaceCards = spacesGrid.querySelectorAll('.space-card');
    const normalizedSearch = searchTerm.toLowerCase().trim();
    
    // Rimuovi messaggio precedente se presente
    const existingMessage = spacesGrid.querySelector('.search-results-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    if (!normalizedSearch) {
        // Se la ricerca è vuota, mostra tutti gli spazi
        spaceCards.forEach(card => {
            card.style.display = 'block';
        });
        return;
    }
    
    let visibleCount = 0;
    spaceCards.forEach(card => {
        const spaceName = card.querySelector('.space-name')?.textContent.toLowerCase() || '';
        const spaceType = card.querySelector('.space-type')?.textContent.toLowerCase() || '';
        const spaceDescription = card.querySelector('.space-description')?.textContent.toLowerCase() || '';
        const spaceLocation = card.querySelector('.space-location')?.textContent.toLowerCase() || '';
        
        const isMatch = spaceName.includes(normalizedSearch) ||
                       spaceType.includes(normalizedSearch) ||
                       spaceDescription.includes(normalizedSearch) ||
                       spaceLocation.includes(normalizedSearch);
        
        if (isMatch) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Mostra messaggio se nessun risultato
    if (visibleCount === 0) {
        showNoResultsMessage(searchTerm);
    }
}

/**
 * Mostra messaggio quando non ci sono risultati
 */
function showNoResultsMessage(searchTerm) {
    const spacesGrid = document.getElementById('spaces-grid');
    if (!spacesGrid) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'search-results-message';
    messageDiv.style.gridColumn = '1 / -1';
    messageDiv.style.textAlign = 'center';
    messageDiv.style.padding = '40px 20px';
    messageDiv.style.color = '#666';
    messageDiv.style.fontSize = '18px';
    
    messageDiv.innerHTML = `
        <div style="color: #ff5722;">
            <span class="material-symbols-outlined" style="font-size: 48px; display: block; margin-bottom: 10px;">search_off</span>
            <strong>Nessun spazio trovato</strong><br>
            <span style="font-size: 16px; color: #999;">Prova con una ricerca diversa per "${searchTerm}"</span>
        </div>
    `;
    
    spacesGrid.appendChild(messageDiv);
}

/**
 * Crea una card per visualizzare uno spazio
 */
function createSpaceCard(space) {
    const card = document.createElement('div');
    card.className = 'space-card';
    
    // Genera un colore pastello casuale per l'header
    const hue = Math.floor(Math.random() * 360);
    const randomColor = `hsl(${hue}, 65%, 85%)`;
    
    // Formatta i giorni disponibili
    const dayNames = {
        1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Gio', 
        5: 'Ven', 6: 'Sab', 7: 'Dom'
    };
    
    const availableDays = space.available_days || space.availableDays || [1, 2, 3, 4, 5];
    const dayText = availableDays.map(day => dayNames[day]).join(', ');
    
    // Formatta gli orari
    const openingTime = space.opening_time || space.openingTime || '09:00';
    const closingTime = space.closing_time || space.closingTime || '18:00';
    const scheduleText = `${openingTime} - ${closingTime}`;
    
    const scheduleHtml = `
        <div class="space-schedule">
            <div class="schedule-time">
                <span class="material-symbols-outlined">schedule</span>
                ${scheduleText}
            </div>
            <div class="schedule-days">${dayText}</div>
        </div>
    `;
    
    card.innerHTML = `
        <div class="space-name" style="--random-color: ${randomColor}">
            ${space.name || space.space_name || 'Nome non disponibile'}
            <div class="space-actions">
                <button class="action-button edit-btn" onclick="editSpace(${space.space_id || space.id})" title="Modifica">
                    <span class="material-symbols-outlined">edit</span>
                </button>
                <button class="action-button delete-btn" onclick="deleteSpace(${space.space_id || space.id})" title="Elimina">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        </div>
        <div class="space-type">${space.spaceType?.name || space.space_type?.name || 'Tipo non specificato'}</div>
        <div class="space-description">${space.description || 'Nessuna descrizione disponibile'}</div>
        <div class="space-details">
            <div class="space-capacity">
                <span class="material-symbols-outlined">group</span>
                ${space.capacity || 'N/A'} person${space.capacity !== 1 ? 'e' : 'a'}
            </div>
            <div class="space-rate">€${space.hourly_rate || space.pricePerHour || space.price_per_hour || '0.00'}/ora</div>
        </div>
        ${scheduleHtml}
        <div class="space-location">${space.location?.name || 'Location non specificata'}</div>
    `;
    
    return card;
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
        if (!window.apiService) return;
        
        const space = await window.apiService.getSpaceById(spaceId);
        const modal = document.getElementById('space-modal');
        const modalTitle = document.getElementById('modal-title');
        const form = document.getElementById('space-form');
        
        if (modal && modalTitle && form && space) {
            modalTitle.textContent = 'Modifica Spazio';
            
            // Popola il form con i dati esistenti
            document.getElementById('space-name').value = space.name || space.space_name || '';
            document.getElementById('space-description').value = space.description || '';
            document.getElementById('space-location').value = space.location_id || space.locationId || '';
            document.getElementById('space-type').value = space.space_type_id || space.spaceTypeId || '';
            document.getElementById('space-capacity').value = space.capacity || '';
            document.getElementById('space-hourly-rate').value = space.hourly_rate || space.pricePerHour || space.price_per_hour || '';
            
            // Popola gli orari di apertura/chiusura
            document.getElementById('space-opening-time').value = space.opening_time || space.openingTime || '09:00';
            document.getElementById('space-closing-time').value = space.closing_time || space.closingTime || '18:00';
            
            // Popola i giorni disponibili
            const dayCheckboxes = form.querySelectorAll('input[name="available_days"]');
            dayCheckboxes.forEach(checkbox => {
                checkbox.checked = false; // Reset tutti
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
        alert('Errore nel caricamento dei dati dello spazio');
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
        if (!window.apiService) return;
        
        await window.apiService.deleteSpace(spaceId);
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
        if (!window.apiService) {
            throw new Error('ApiService non disponibile');
        }

        if (form.dataset.mode === 'edit') {
            // Modifica spazio esistente
            const spaceId = parseInt(form.dataset.spaceId);
            await window.apiService.updateSpace(spaceId, spaceData);
            alert('Spazio modificato con successo');
        } else {
            // Crea nuovo spazio
            await window.apiService.createSpace(spaceData);
            alert('Spazio creato con successo');
        }

        closeSpaceModal();
        loadSpaces(); // Ricarica la lista
    } catch (error) {
        console.error('Errore nel salvataggio dello spazio:', error);
        alert('Errore nel salvataggio dello spazio: ' + (error.message || 'Errore sconosciuto'));
    }
}

// Funzioni globali per i pulsanti nelle card
window.editSpace = editSpace;
window.deleteSpace = deleteSpace;
window.editLocation = editLocation;
window.deleteLocation = deleteLocation;
window.loadManagerLocations = loadManagerLocations;
