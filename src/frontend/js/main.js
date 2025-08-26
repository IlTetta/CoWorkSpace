// Funzione per testare la connessione al server
async function pingServer() {
    try {
        const healthData = await apiService.healthCheck();
        console.log('Server health check:', healthData);
        alert(`Server is ${healthData.status}. Database: ${healthData.database.status}`);
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore nella connessione al server');
    }
}

// Funzione per ottenere informazioni sull'API
async function getApiInfo() {
    try {
        const apiData = await apiService.getApiInfo();
        console.log('API Info:', apiData);
        alert(`API: ${apiData.name} v${apiData.version}`);
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore nel recupero delle informazioni API');
    }
}

// Funzione per testare le chiamate API principali
async function testApiEndpoints() {
    try {
        console.log('Testing API endpoints...');
        
        // Test locations
        const locations = await apiService.getAllLocations();
        console.log(`✓ Locations: ${locations.length} found`);
        
        // Test space types
        const spaceTypes = await apiService.getAllSpaceTypes();
        console.log(`✓ Space Types: ${spaceTypes.length} found`);
        
        // Test spaces
        const spaces = await apiService.getAllSpaces();
        console.log(`✓ Spaces: ${spaces.length} found`);
        
        alert('Tutti gli endpoint API funzionano correttamente!');
        
    } catch (error) {
        console.error('Errore nel test degli endpoints:', error);
        alert(`Errore nel test API: ${error.message}`);
    }
}

// Funzioni di utilità per il frontend
const FrontendUtils = {
    // Formattazione valuta
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    },
    
    // Formattazione data
    formatDate: (date) => {
        return new Intl.DateTimeFormat('it-IT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(date));
    },
    
    // Formattazione orario
    formatTime: (time) => {
        return new Intl.DateTimeFormat('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(`2000-01-01T${time}`));
    },
    
    // Sanitizzazione HTML per prevenire XSS
    escapeHtml: (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Gestione errori UI
    showError: (message, containerId = 'error-container') => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="error-message">${FrontendUtils.escapeHtml(message)}</div>`;
            container.style.display = 'block';
        } else {
            console.error('Error container not found:', containerId);
            alert(message);
        }
    },
    
    // Mostra messaggio di successo
    showSuccess: (message, containerId = 'success-container') => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="success-message">${FrontendUtils.escapeHtml(message)}</div>`;
            container.style.display = 'block';
        } else {
            console.log('Success:', message);
        }
    }
};
