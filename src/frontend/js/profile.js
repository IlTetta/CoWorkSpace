// Profile.js - Gestisce le funzionalità della pagina profilo

document.addEventListener('DOMContentLoaded', function() {
    // Verifica se l'utente è autenticato (permetti accesso in sviluppo)
    const isDevelopment = window.location.protocol === 'file:' || 
                         window.location.hostname === '127.0.0.1' || 
                                 window.location.hostname === 'coworkspace-fxyv.onrender.com' ||
                         window.location.port === '5500'; // Live Server porta di default
    
    if (!isDevelopment) {
        const token = localStorage.getItem('coworkspace_token');
        if (!token) {
            // Se non c'è token e non siamo in sviluppo, reindirizza al login
            window.location.href = 'login.html';
            return;
        }
    }
    
    // Se siamo in sviluppo e non ci sono dati utente, aggiungi dati di test
    if (isDevelopment && !localStorage.getItem('coworkspace_user')) {
        const testUser = {
            name: 'Mario',
            surname: 'Rossi', 
            email: 'mario.rossi@example.com',
            role: 'client',
            created_at: '2024-01-15T10:30:00Z',
            manager_request_pending: false
        };
        localStorage.setItem('coworkspace_user', JSON.stringify(testUser));
        // Popola automaticamente le informazioni utente nella pagina
        populateUserInfoDisplay();
    }
    
    // Inizializza i gestori dei pulsanti
    initializeButtons();
    // Inizializza il gestore per il caricamento dell'immagine del profilo
    initializeProfileImageUpload();
    // Carica l'immagine del profilo salvata (se presente)
    loadSavedProfileImage();
    // Carica e popola le informazioni utente
    loadAndPopulateUserInfo();
    // Carica la cronologia pagamenti se la sezione è presente
    if (document.getElementById('payment-history-container')) {
        loadPaymentHistory();
    }
});

/**
 * Inizializza i gestori degli eventi per i pulsanti
 */
function initializeButtons() {
    // Gestore per il logo (reindirizza alla home)
    const logo = document.getElementById('logo');
    if (logo) {
        logo.addEventListener('click', function(e) {
            e.preventDefault();
            // Reindirizza alla pagina home
            window.location.href = 'home.html';
        });
    }

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

    // Gestore per il pulsante Info utente
    const userInfoBtn = document.getElementById('user-info-btn');
    if (userInfoBtn) {
        userInfoBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showUserInfo();
        });
    }

    // Gestore per il pulsante Storico prenotazioni
    const bookingHistoryBtn = document.getElementById('booking-history-btn');
    if (bookingHistoryBtn) {
        bookingHistoryBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showBookingHistory();
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
 * Mostra le informazioni dell'utente
 */
function showUserInfo() {
    console.log('Mostra info utente');
    
    // Ottieni i dati dell'utente dal localStorage o API
    const user = getUserData();
    if (!user) {
        alert('Impossibile recuperare le informazioni utente. Effettua nuovamente il login.');
        return;
    }
    
    // Popola il form con i dati dell'utente
    populateUserInfoForm(user);
    
    // Mostra il form integrato
    const modal = document.getElementById('user-info-modal');
    if (modal) {
        modal.style.display = 'block';
        
        // Setup del pulsante di chiusura
        setupCloseButton();
    }
}

/**
 * Mostra lo storico delle prenotazioni
 */
function showBookingHistory() {
    console.log('Mostra storico prenotazioni');
    // TODO: Implementare la visualizzazione dello storico prenotazioni
    alert('Funzionalità Storico prenotazioni - Da implementare');
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
        localStorage.setItem('profile_image', imageDataUrl);
        console.log('Immagine del profilo salvata');
    } catch (error) {
        console.error('Errore nel salvare l\'immagine del profilo:', error);
        alert('Errore nel salvare l\'immagine. Potrebbe essere troppo grande.');
    }
}

/**
 * Carica l'immagine del profilo salvata
 */
function loadSavedProfileImage() {
    try {
        const savedImage = localStorage.getItem('profile_image');
        if (savedImage) {
            displayProfileImage(savedImage);
        }
    } catch (error) {
        console.error('Errore nel caricare l\'immagine del profilo:', error);
    }
}

/**
 * Mostra il menu contestuale
 */
function showContextMenu(event, contextMenu) {
    const rect = event.currentTarget.getBoundingClientRect();
    contextMenu.style.display = 'block';
    contextMenu.style.left = (rect.left + 180) + 'px'; // Spostato più a sinistra (-20px invece di right+10)
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
            localStorage.removeItem('profile_image');
            console.log('Immagine del profilo rimossa');
        } catch (error) {
            console.error('Errore nella rimozione dell\'immagine del profilo:', error);
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
        console.error('Errore nel recuperare i dati utente:', error);
        return null;
    }
}

/**
 * Popola il form con le informazioni dell'utente
 */
function populateUserInfoForm(user) {
    // Popola i campi con i dati dell'utente
    document.getElementById('display-name').value = user.name || 'N/A';
    document.getElementById('display-surname').value = user.surname || 'N/A';
    document.getElementById('display-email').value = user.email || 'N/A';
    
    // Determina il ruolo basato sui dati dell'utente
    let role = 'Client'; // Default
    if (user.role === 'manager') {
        role = 'Manager';
    } else if (user.role === 'admin') {
        role = 'Admin';
    } else if (user.manager_request_pending) {
        role = 'Client (Richiesta Manager in sospeso)';
    }
    
    document.getElementById('display-role').value = role;
    
    // Formatta la data di registrazione
    if (user.created_at) {
        const date = new Date(user.created_at);
        const formattedDate = date.toLocaleDateString('it-IT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById('display-registration').value = formattedDate;
    } else {
        document.getElementById('display-registration').value = 'N/A';
    }
}

/**
 * Configura il pulsante di chiusura per il form integrato
 */
function setupCloseButton() {
    const closeBtn = document.getElementById('close-user-info');
    
    // Rimuovi event listener precedenti per evitare duplicazioni
    if (closeBtn && !closeBtn.dataset.listenerAdded) {
        closeBtn.addEventListener('click', function() {
            closeUserInfoForm();
        });
        closeBtn.dataset.listenerAdded = 'true';
    }
}

/**
 * Chiude il form delle info utente
 */
function closeUserInfoForm() {
    const modal = document.getElementById('user-info-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Popola automaticamente le informazioni utente nelle card della pagina
 */
function populateUserInfoDisplay() {
    const user = getUserData();
    if (!user) {
        console.log('Nessun dato utente trovato');
        return;
    }

    // Popola i campi con i dati dell'utente usando textContent invece di value
    const nameSpan = document.getElementById('display-name');
    const surnameSpan = document.getElementById('display-surname');
    const emailSpan = document.getElementById('display-email');
    const roleSpan = document.getElementById('display-role');
    const registrationSpan = document.getElementById('display-registration');

    if (nameSpan) nameSpan.textContent = user.name || 'N/A';
    if (surnameSpan) surnameSpan.textContent = user.surname || 'N/A';
    if (emailSpan) emailSpan.textContent = user.email || 'N/A';
    
    // Determina il ruolo basato sui dati dell'utente
    let role = 'Client'; // Default
    if (user.role === 'manager') {
        role = 'Manager';
    } else if (user.role === 'admin') {
        role = 'Admin';
    } else if (user.manager_request_pending) {
        role = 'Client (Richiesta Manager in sospeso)';
    }
    
    if (roleSpan) roleSpan.textContent = role;
    
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
 * Carica le informazioni utente dal server e le popola nella pagina
 */
async function loadAndPopulateUserInfo() {
    try {
        // Prima controlla se abbiamo un token
        const token = localStorage.getItem('coworkspace_token');
        
        if (!token) {
            // Se non c'è token, usa i dati di test per lo sviluppo
            const isDevelopment = window.location.protocol === 'file:' || 
                                 window.location.hostname === '127.0.0.1' || 
                                 window.location.hostname === 'coworkspace-fxyv.onrender.com' ||
                                 window.location.hostname.includes('coworkspace-fxyv.onrender.com') ||
                                 ['5500', '5501', '5502', '3000', '8080', '8000'].includes(window.location.port);
            
            if (isDevelopment) {
                populateUserInfoDisplay();
                return;
            }
        }

        // Se abbiamo un token, prova a recuperare i dati dal server
        if (window.apiService && typeof window.apiService.getCurrentUser === 'function') {
            const userResponse = await window.apiService.getCurrentUser();
            
            if (userResponse) {
                // Salva i dati aggiornati nel localStorage
                localStorage.setItem('coworkspace_user', JSON.stringify(userResponse));
                // Popola la pagina con i dati del server
                populateUserInfoDisplay();
                return;
            }
        }

        // Fallback: usa i dati dal localStorage se disponibili
        populateUserInfoDisplay();
        
    } catch (error) {
        console.error('Errore nel caricare le informazioni utente dal server:', error);
        // In caso di errore, usa i dati dal localStorage
        populateUserInfoDisplay();
    }
}

/**
 * Carica la cronologia pagamenti dell'utente
 */
async function loadPaymentHistory() {
    const container = document.getElementById('payment-history-container');
    if (!container) return;

    try {
        // Mostra lo stato di caricamento
        showPaymentHistoryLoading();

        // Prima controlla se abbiamo un token
        const token = localStorage.getItem('coworkspace_token');
        
        if (!token) {
            // Se non c'è token, usa i dati di test per lo sviluppo
            const isDevelopment = window.location.protocol === 'file:' || 
                                 window.location.hostname === '127.0.0.1' || 
                                 window.location.hostname === 'localhost' ||
                                 window.location.hostname.includes('localhost') ||
                                 ['5500', '5501', '5502', '3000', '8080', '8000'].includes(window.location.port);
            
            if (isDevelopment) {
                // Simula un ritardo per il caricamento
                setTimeout(() => {
                    displayTestPaymentHistory();
                }, 1000);
                return;
            }
        }

        // Se abbiamo un token, prova a recuperare i dati dal server
        const bookings = await fetchUserBookings();
        
        if (bookings && bookings.length > 0) {
            displayPaymentHistory(bookings);
        } else {
            showEmptyPaymentHistory();
        }
        
    } catch (error) {
        console.error('Errore nel caricare la cronologia pagamenti:', error);
        // In caso di errore, mostra stato vuoto
        showEmptyPaymentHistory();
    }
}

/**
 * Recupera le prenotazioni dell'utente dal server
 */
async function fetchUserBookings() {
    try {
        const token = localStorage.getItem('coworkspace_token');
        if (!token) {
            console.log('Nessun token disponibile');
            return null;
        }

        console.log('Chiamata API per recuperare prenotazioni...');
        
        // URL dell'API backend
    const baseUrl = 'https://coworkspace-fxyv.onrender.com';
        const response = await fetch(`${baseUrl}/api/bookings`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Risposta API:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Errore API:', errorData);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Dati ricevuti:', data);
        
        // L'API restituisce i dati in formato { success: true, data: { items: [...] } }
        if (data.success && data.data && data.data.items) {
            return data.data.items;
        } else if (Array.isArray(data)) {
            // Fallback se l'API restituisce direttamente l'array
            return data;
        } else {
            console.log('Nessuna prenotazione trovata');
            return [];
        }
    } catch (error) {
        console.error('Errore nel recuperare le prenotazioni:', error);
        return null;
    }
}

/**
 * Mostra lo stato di caricamento per la cronologia pagamenti
 */
function showPaymentHistoryLoading() {
    const container = document.getElementById('payment-history-container');
    container.innerHTML = `
        <div class="payment-list-container">
            <div class="payment-history-header">
                <h2 class="payment-history-title">Cronologia Pagamenti</h2>
                <div class="payment-stats">
                    <div class="stat-item">
                        <span class="stat-value">-</span>
                        <span class="stat-label">Prenotazioni</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">-</span>
                        <span class="stat-label">Totale Speso</span>
                    </div>
                </div>
            </div>
            <div class="loading-spinner">
                <div class="spinner"></div>
            </div>
        </div>
    `;
}

/**
 * Mostra lo stato vuoto per la cronologia pagamenti
 */
function showEmptyPaymentHistory() {
    const container = document.getElementById('payment-history-container');
    container.innerHTML = `
        <div class="payment-list-container">
            <div class="payment-history-header">
                <h2 class="payment-history-title">Cronologia Pagamenti</h2>
                <div class="payment-stats">
                    <div class="stat-item">
                        <span class="stat-value">0</span>
                        <span class="stat-label">Prenotazioni</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">€0</span>
                        <span class="stat-label">Totale Speso</span>
                    </div>
                </div>
            </div>
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <h3>Nessun pagamento trovato</h3>
                <p>Non hai ancora effettuato prenotazioni. Inizia a prenotare i tuoi spazi!</p>
            </div>
        </div>
    `;
}

/**
 * Visualizza i dati di test per la cronologia pagamenti
 */
function displayTestPaymentHistory() {
    const testBookings = [
        {
            booking_id: 1,
            location_name: "CoWork Milano Centro",
            space_name: "Sala Riunioni A",
            start_date: "2024-12-15",
            end_date: "2024-12-15",
            total_price: 75.00,
            status: "completed",
            payment_status: "completed",
            created_at: "2024-12-10T10:30:00Z"
        },
        {
            booking_id: 2,
            location_name: "CoWork Roma EUR",
            space_name: "Postazione Desk 12",
            start_date: "2024-12-08",
            end_date: "2024-12-10",
            total_price: 150.00,
            status: "completed",
            payment_status: "completed",
            created_at: "2024-12-05T14:15:00Z"
        },
        {
            booking_id: 3,
            location_name: "CoWork Torino",
            space_name: "Ufficio Privato 3",
            start_date: "2024-11-25",
            end_date: "2024-11-25",
            total_price: 120.00,
            status: "completed",
            payment_status: "completed",
            created_at: "2024-11-20T09:45:00Z"
        }
    ];

    displayPaymentHistory(testBookings);
}

/**
 * Visualizza la cronologia pagamenti
 */
function displayPaymentHistory(bookings) {
    const container = document.getElementById('payment-history-container');
    
    if (!container) {
        return;
    }
    
    // Calcola le statistiche
    const totalBookings = bookings.length;
    const totalSpent = bookings.reduce((sum, booking) => sum + (parseFloat(booking.total_price) || 0), 0);
    
    // Crea l'HTML per la cronologia
    const paymentListHTML = bookings.map(booking => {
        const startDate = new Date(booking.start_date);
        const endDate = new Date(booking.end_date);
        const createdDate = new Date(booking.created_at);
        
        const formatDate = (date) => {
            return date.toLocaleDateString('it-IT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        };
        
        const getStatusClass = (status) => {
            switch(status) {
                case 'completed': return 'status-completed';
                case 'confirmed': return 'status-completed';
                case 'pending': return 'status-pending';
                case 'cancelled': return 'status-cancelled';
                default: return 'status-pending';
            }
        };
        
        const getStatusText = (status) => {
            switch(status) {
                case 'completed': return 'Completata';
                case 'confirmed': return 'Confermata';
                case 'pending': return 'In Attesa';
                case 'cancelled': return 'Cancellata';
                default: return 'In Attesa';
            }
        };
        
        const getPaymentStatusClass = (paymentStatus) => {
            switch(paymentStatus) {
                case 'completed': return 'status-completed';
                case 'paid': return 'status-completed'; // Supporto legacy
                case 'pending': return 'status-pending';
                case 'failed': return 'status-cancelled';
                case 'refunded': return 'status-cancelled';
                default: return 'status-pending';
            }
        };
        
        const getPaymentStatusText = (paymentStatus) => {
            switch(paymentStatus) {
                case 'completed': return 'Pagato';
                case 'paid': return 'Pagato'; // Supporto legacy
                case 'pending': return 'In Attesa';
                case 'failed': return 'Fallito';
                case 'refunded': return 'Rimborsato';
                default: return 'In Attesa';
            }
        };
        
        const duration = startDate.getTime() === endDate.getTime() 
            ? `${formatDate(startDate)}`
            : `${formatDate(startDate)} - ${formatDate(endDate)}`;
            
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const durationText = daysDiff === 1 ? '1 giorno' : `${daysDiff} giorni`;
            
        return `
            <div class="payment-item">
                <div class="payment-header">
                    <h3 class="payment-location">${booking.location_name || 'N/A'}</h3>
                    <span class="payment-amount">€${parseFloat(booking.total_price || 0).toFixed(2)}</span>
                </div>
                <div class="payment-details">
                    <div class="payment-detail">
                        <span class="payment-detail-label">Spazio</span>
                        <span class="payment-detail-value">${booking.space_name || 'N/A'}</span>
                    </div>
                    <div class="payment-detail">
                        <span class="payment-detail-label">Periodo</span>
                        <span class="payment-detail-value">${duration}</span>
                    </div>
                    <div class="payment-detail">
                        <span class="payment-detail-label">Durata</span>
                        <span class="payment-detail-value">${durationText}</span>
                    </div>
                    <div class="payment-detail">
                        <span class="payment-detail-label">Data Prenotazione</span>
                        <span class="payment-detail-value">${formatDate(createdDate)}</span>
                    </div>
                    <div class="payment-detail">
                        <span class="payment-detail-label">Stato Prenotazione</span>
                        <span class="payment-status ${getStatusClass(booking.status)}">${getStatusText(booking.status)}</span>
                    </div>
                    <div class="payment-detail">
                        <span class="payment-detail-label">Stato Pagamento</span>
                        <span class="payment-status ${getPaymentStatusClass(booking.payment_status)}">${getPaymentStatusText(booking.payment_status)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div class="payment-list-container">
            <div class="payment-history-header">
                <h2 class="payment-history-title">Cronologia Pagamenti</h2>
                <div class="payment-stats">
                    <div class="stat-item">
                        <span class="stat-value">${totalBookings}</span>
                        <span class="stat-label">Prenotazioni</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">€${totalSpent.toFixed(2)}</span>
                        <span class="stat-label">Totale Speso</span>
                    </div>
                </div>
            </div>
            <div class="payment-list">
                ${paymentListHTML}
            </div>
        </div>
    `;
}
