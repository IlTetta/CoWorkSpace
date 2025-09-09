// Gestione della pagina di prenotazione workspace: caricamento dettagli, servizi, form, pagamento

document.addEventListener('DOMContentLoaded', () => {
    // Funzione per aggiornare l'anteprima del prezzo
    async function updatePricePreview() {
        const date = document.getElementById('date').value;
        const time = document.getElementById('time').value;
        const duration = document.getElementById('duration').value;
        const services = Array.from(document.getElementById('services')?.selectedOptions || []).map(opt => opt.value);
        
        // Aggiorna il prezzo solo se tutti i campi sono compilati
        if (date && time && duration) {
            try {
                const price = await window.apiService.calculateBookingPrice(workspaceId, date, time, duration, services);
                // Ho corretto l'ID da 'price-preview-value' a 'price'
                document.getElementById('price').value = price;
            } catch {
                document.getElementById('price').value = '';
                document.getElementById('price').placeholder = '-';
            }
        } else {
            document.getElementById('price').value = '';
            document.getElementById('price').placeholder = '0';
        }
    }

    // Aggiungi i listener direttamente all'inizio per l'aggiornamento dinamico
    document.getElementById('date').addEventListener('change', updatePricePreview);
    document.getElementById('time').addEventListener('change', updatePricePreview);
    document.getElementById('duration').addEventListener('change', updatePricePreview);
    document.getElementById('services').addEventListener('change', updatePricePreview);

    // Recupera id workspace da sessionStorage o query string
    const workspaceId = sessionStorage.getItem('selectedWorkspaceId') || getWorkspaceIdFromUrl();
    if (!workspaceId) {
        document.getElementById('booking-message').textContent = 'Workspace non trovato.';
        return;
    }

    // Carica dettagli workspace
    window.apiService.getWorkspaceDetails(workspaceId).then(workspace => {
        renderWorkspaceDetails(workspace);
    }).catch(() => {
        document.getElementById('booking-message').textContent = 'Errore nel caricamento del workspace. Mostro dati generici.';
        renderWorkspaceDetails({
            name: 'Workspace',
            type: 'Spazio condiviso',
            description: 'Spazio di lavoro disponibile per prenotazione.',
            capacity: 'N/D',
            services: ['WiFi', 'Scrivania']
        });
    });

    // Carica servizi aggiuntivi
    window.apiService.getAdditionalServices().then(services => {
        renderServicesOptions(services);
    });

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
});

function renderWorkspaceDetails(workspace) {
    document.querySelector('.workspace-title').textContent = workspace.name;
    document.querySelector('.workspace-type').textContent = workspace.type || '';
    document.getElementById('workspace-description').textContent = workspace.description;
    document.getElementById('workspace-capacity').textContent = workspace.capacity;
    document.getElementById('workspace-services').textContent = workspace.services ? workspace.services.join(', ') : '';
}

function renderServicesOptions(services) {
    const select = document.getElementById('services');
    select.innerHTML = '';
    services.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        select.appendChild(opt);
    });
}

function getWorkspaceIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}
