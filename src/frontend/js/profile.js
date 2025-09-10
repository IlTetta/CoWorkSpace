// Profile.js - Gestisce le funzionalità della pagina profilo

document.addEventListener('DOMContentLoaded', function() {
    // Verifica se l'utente è autenticato (permetti accesso in sviluppo)
    const isDevelopment = window.location.protocol === 'file:' || 
                         window.location.hostname === '127.0.0.1' || 
                         window.location.hostname === 'localhost:3000' ||
                         window.location.port === '5500'; // Live Server porta di default
    
    if (!isDevelopment) {
        const token = localStorage.getItem('jwtToken');
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
    }
    
    // Inizializza i gestori dei pulsanti
    initializeButtons();
    // Inizializza il gestore per il caricamento dell'immagine del profilo
    initializeProfileImageUpload();
    // Carica l'immagine del profilo salvata (se presente)
    loadSavedProfileImage();
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
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('coworkspace_user');
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Errore durante il logout:', error);
        // Fallback in caso di errore
        localStorage.removeItem('jwtToken');
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
