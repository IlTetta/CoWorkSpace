// dashboard-admin.js
// Popola le sezioni admin: richieste manager, lista utenti, lista manager

document.addEventListener('DOMContentLoaded', () => {
    loadManagerRequests();
    loadUsersList();
    loadManagersList();
    loadLocationsList();
    loadSpacesList();
    loadBookingsList();
    loadUserProfile();
    setupEventListeners();
    setupModalEventListeners();
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
    
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            window.location.href = 'home.html';
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }
}

// Carica profilo utente admin
function loadUserProfile() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
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
    
    fetch('/api/admin/users/manager-requests/pending', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
        .then(res => res.json())
        .then(data => {
            container.innerHTML = '';
            
            if (!data.success || !data.data || data.data.length === 0) {
                container.innerHTML = '<p>Nessuna richiesta pendente.</p>';
                return;
            }
            
            data.data.forEach(request => {
                const div = document.createElement('div');
                div.className = 'request-item';
                div.innerHTML = `
                    <span>${request.name} ${request.surname} (${request.email})</span>
                    <div>
                        <button onclick="acceptManager('${request.user_id}')">Accetta</button>
                        <button onclick="rejectManager('${request.user_id}')">Rifiuta</button>
                    </div>
                `;
                container.appendChild(div);
            });
        })
        .catch(err => {
            console.error('Errore nel caricamento richieste manager:', err);
            container.innerHTML = '<p>Errore nel caricamento delle richieste.</p>';
        });
}

function acceptManager(userId) {
    fetch(`/api/admin/users/${userId}/approve-manager`, { 
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
    fetch(`/api/admin/users/${userId}/reject-manager`, { 
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
    
    fetch('/api/admin/users', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
        .then(res => res.json())
        .then(data => {
            container.innerHTML = '';
            
            if (!data.success || !data.data || data.data.length === 0) {
                container.innerHTML = '<p>Nessun utente trovato.</p>';
                return;
            }
            
            data.data.forEach(user => {
                const div = document.createElement('div');
                div.className = 'user-item';
                div.innerHTML = `
                    <span>${user.name} ${user.surname} (${user.email}) - ${user.role}</span>
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
    console.log('🔄 loadManagersList chiamata!');
    
    // Mostra feedback di caricamento
    const container = document.getElementById('managers-list');
    if (!container) {
        console.error('❌ Container managers-list non trovato!');
        return;
    }
    
    container.innerHTML = '<p>🔄 Caricamento manager...</p>';
    
    fetch('/api/admin/managers', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
        .then(res => res.json())
        .then(data => {
            container.innerHTML = '';
            
            if (!data.success || !data.data || data.data.length === 0) {
                container.innerHTML = '<p>Nessun manager trovato.</p>';
                return;
            }
            
            data.data.forEach(manager => {
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
function loadLocationsList() {
    const container = document.getElementById('locations-list');
    container.innerHTML = '<p>🔄 Caricamento location...</p>';
    
    fetch('/api/admin/locations', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
        .then(res => res.json())
        .then(data => {
            container.innerHTML = '';
            
            if (!data.success || !data.data || data.data.length === 0) {
                container.innerHTML = '<p>Nessuna location trovata.</p>';
                return;
            }
            
            data.data.forEach(location => {
                const div = document.createElement('div');
                div.className = 'location-item';
                div.innerHTML = `
                    <div class="item-info">
                        <div class="item-title">${location.name}</div>
                        <div class="item-details">${location.address}, ${location.city}</div>
                        <div class="item-details">${location.description || 'Nessuna descrizione'}</div>
                    </div>
                    <div class="item-actions">
                        <button class="edit-btn" onclick="editLocation('${location.location_id}')">Modifica</button>
                        <button class="delete-btn" onclick="deleteLocation('${location.location_id}')">Elimina</button>
                    </div>
                `;
                container.appendChild(div);
            });
        })
        .catch(err => {
            console.error('Errore nel caricamento location:', err);
            container.innerHTML = '<p>Errore nel caricamento delle location.</p>';
        });
}

function openLocationModal(locationId = null) {
    const modal = document.getElementById('location-modal');
    const title = document.getElementById('location-modal-title');
    const form = document.getElementById('location-form');
    
    if (locationId) {
        title.textContent = 'Modifica Location';
        // Carica dati location per modifica
        fetch(`/api/admin/locations/${locationId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.data) {
                const location = data.data;
                document.getElementById('location-name').value = location.name || '';
                document.getElementById('location-description').value = location.description || '';
                document.getElementById('location-address').value = location.address || '';
                document.getElementById('location-city').value = location.city || '';
                form.dataset.locationId = locationId;
            }
        })
        .catch(err => console.error('Errore caricamento location:', err));
    } else {
        title.textContent = 'Aggiungi Nuova Location';
        form.reset();
        delete form.dataset.locationId;
    }
    
    modal.style.display = 'block';
}

function editLocation(locationId) {
    openLocationModal(locationId);
}

function deleteLocation(locationId) {
    if (!confirm('Sei sicuro di voler eliminare questa location?')) return;
    
    fetch(`/api/admin/locations/${locationId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showMessage('Location eliminata con successo!', 'success');
                loadLocationsList();
            } else {
                showMessage('Errore nell\'eliminazione della location', 'error');
            }
        })
        .catch(err => {
            console.error('Errore nell\'eliminazione:', err);
            showMessage('Errore nell\'eliminazione della location', 'error');
        });
}

// === GESTIONE SPAZI ===
function loadSpacesList() {
    const container = document.getElementById('spaces-list');
    container.innerHTML = '<p>🔄 Caricamento spazi...</p>';
    
    fetch('/api/admin/spaces', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
        .then(res => res.json())
        .then(data => {
            container.innerHTML = '';
            
            if (!data.success || !data.data || data.data.length === 0) {
                container.innerHTML = '<p>Nessuno spazio trovato.</p>';
                return;
            }
            
            data.data.forEach(space => {
                const div = document.createElement('div');
                div.className = 'space-item';
                div.innerHTML = `
                    <div class="item-info">
                        <div class="item-title">${space.name}</div>
                        <div class="item-details">Capacità: ${space.capacity} persone - €${space.hourly_rate}/ora</div>
                        <div class="item-details">${space.description || 'Nessuna descrizione'}</div>
                        <div class="item-details">Location: ${space.location_name || 'N/A'}</div>
                    </div>
                    <div class="item-actions">
                        <button class="edit-btn" onclick="editSpace('${space.space_id}')">Modifica</button>
                        <button class="delete-btn" onclick="deleteSpace('${space.space_id}')">Elimina</button>
                    </div>
                `;
                container.appendChild(div);
            });
        })
        .catch(err => {
            console.error('Errore nel caricamento spazi:', err);
            container.innerHTML = '<p>Errore nel caricamento degli spazi.</p>';
        });
}

function openSpaceModal(spaceId = null) {
    const modal = document.getElementById('space-modal');
    const title = document.getElementById('space-modal-title');
    const form = document.getElementById('space-form');
    
    if (spaceId) {
        title.textContent = 'Modifica Spazio';
        // Carica dati spazio per modifica
        fetch(`/api/admin/spaces/${spaceId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.data) {
                const space = data.data;
                document.getElementById('space-name').value = space.name || '';
                document.getElementById('space-description').value = space.description || '';
                document.getElementById('space-location').value = space.location_id || '';
                document.getElementById('space-type').value = space.space_type_id || '';
                document.getElementById('space-capacity').value = space.capacity || '';
                document.getElementById('space-hourly-rate').value = space.hourly_rate || '';
                document.getElementById('space-opening-time').value = space.opening_time || '';
                document.getElementById('space-closing-time').value = space.closing_time || '';
                
                // Set available days checkboxes
                if (space.available_days) {
                    const availableDays = typeof space.available_days === 'string' 
                        ? space.available_days.split(',') 
                        : space.available_days;
                    
                    document.querySelectorAll('input[name="available_days"]').forEach(checkbox => {
                        checkbox.checked = availableDays.includes(checkbox.value);
                    });
                }
                
                form.dataset.spaceId = spaceId;
            }
        })
        .catch(err => console.error('Errore caricamento spazio:', err));
    } else {
        title.textContent = 'Crea Nuovo Spazio';
        form.reset();
        delete form.dataset.spaceId;
    }
    
    modal.style.display = 'block';
    loadLocationsForSelect();
    loadSpaceTypesForSelect();
}

function editSpace(spaceId) {
    openSpaceModal(spaceId);
}

function deleteSpace(spaceId) {
    if (!confirm('Sei sicuro di voler eliminare questo spazio?')) return;
    
    fetch(`/api/admin/spaces/${spaceId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showMessage('Spazio eliminato con successo!', 'success');
                loadSpacesList();
            } else {
                showMessage('Errore nell\'eliminazione dello spazio', 'error');
            }
        })
        .catch(err => {
            console.error('Errore nell\'eliminazione:', err);
            showMessage('Errore nell\'eliminazione dello spazio', 'error');
        });
}

// === GESTIONE PRENOTAZIONI ===
function loadBookingsList() {
    const container = document.getElementById('bookings-list');
    container.innerHTML = '<p>🔄 Caricamento prenotazioni...</p>';
    
    fetch('/api/admin/bookings', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
        .then(res => res.json())
        .then(data => {
            container.innerHTML = '';
            
            if (!data.success || !data.data || data.data.length === 0) {
                container.innerHTML = '<p>Nessuna prenotazione trovata.</p>';
                return;
            }
            
            data.data.forEach(booking => {
                const div = document.createElement('div');
                div.className = 'booking-item';
                const startDate = new Date(booking.start_datetime).toLocaleString('it-IT');
                const endDate = new Date(booking.end_datetime).toLocaleString('it-IT');
                
                div.innerHTML = `
                    <div class="item-info">
                        <div class="item-title">Prenotazione #${booking.booking_id}</div>
                        <div class="item-details">Utente: ${booking.user_name || 'N/A'}</div>
                        <div class="item-details">Spazio: ${booking.space_name || 'N/A'}</div>
                        <div class="item-details">Dal: ${startDate} al: ${endDate}</div>
                        <div class="item-details">Stato: ${booking.status} - €${booking.total_amount}</div>
                    </div>
                    <div class="item-actions">
                        <button class="delete-btn" onclick="deleteBooking('${booking.booking_id}')">Elimina</button>
                    </div>
                `;
                container.appendChild(div);
            });
        })
        .catch(err => {
            console.error('Errore nel caricamento prenotazioni:', err);
            container.innerHTML = '<p>Errore nel caricamento delle prenotazioni.</p>';
        });
}

function deleteBooking(bookingId) {
    if (!confirm('Sei sicuro di voler eliminare questa prenotazione?')) return;
    
    fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showMessage('Prenotazione eliminata con successo!', 'success');
                loadBookingsList();
            } else {
                showMessage('Errore nell\'eliminazione della prenotazione', 'error');
            }
        })
        .catch(err => {
            console.error('Errore nell\'eliminazione:', err);
            showMessage('Errore nell\'eliminazione della prenotazione', 'error');
        });
}

// === FUNZIONI HELPER ===
function loadLocationsForSelect() {
    fetch('/api/admin/locations', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
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
    fetch('/api/admin/space-types', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
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
    
    // Submit forms
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
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
                loadSpacesList();
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
