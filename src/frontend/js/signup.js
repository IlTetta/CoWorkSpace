// Riferimenti ai campi input
const signupForm = document.getElementById('signup-form');
const signupButton = document.querySelector('.signup-button');
const nameInput = document.getElementById('username');
const surnameInput = document.getElementById('surname');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const roleInput = document.getElementById('role');

// URL dell'endpoint API per la registrazione
const API_ENDPOINT = 'http://localhost:3000/api/users/register';

// Funzione per creare e mostrare un messaggio di errore sotto un campo specifico
function showFieldError(input, message) {
    // Rimuovi eventuali messaggi di errore esistenti per questo campo
    clearFieldError(input);

    const errorEl = document.createElement('span');
    errorEl.className = 'field-error';
    errorEl.textContent = message;

    // Inserisci il messaggio di errore dopo il div .input-container
    input.parentElement.after(errorEl);
}

// Funzione per cancellare un messaggio di errore sotto un campo specifico
function clearFieldError(input) {
    const errorEl = input.parentElement.nextElementSibling;
    if (errorEl && errorEl.classList.contains('field-error')) {
        errorEl.remove();
    }
}

// Funzione per mostrare un messaggio generale (successo/errore)
function showGeneralMessage(message, type) {
    const messageContainer = document.getElementById('message-container') || signupForm;
    let messageBox = messageContainer.querySelector('.message-box');
    if (!messageBox) {
        messageBox = document.createElement('div');
        messageBox.className = 'message-box';
        // Inserisce il messaggio prima del form
        signupForm.prepend(messageBox);
    }
    messageBox.textContent = message;
    messageBox.className = `message-box ${type}-message`;
}

// Messaggi generali sotto il pulsante signup
function showGeneralError(message) {
    let errorContainer = document.querySelector('.signup-error-container');
    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.className = 'signup-error-container';
        errorContainer.style.color = 'red';
        errorContainer.style.marginTop = '10px';
        errorContainer.style.fontSize = '14px';
        signupButton.parentElement.appendChild(errorContainer);
    }
    errorContainer.textContent = message;
}

function clearGeneralError() {
    const errorContainer = document.querySelector('.signup-error-container');
    if (errorContainer) errorContainer.textContent = '';
}

// Funzione per cancellare tutti i messaggi di errore e i messaggi generali
function clearAllMessages() {
    const fieldErrors = document.querySelectorAll('.field-error');
    fieldErrors.forEach(el => el.remove());
    
    const generalMessages = document.querySelectorAll('.message-box');
    generalMessages.forEach(el => el.remove());
    
    clearGeneralError();
}

// Gestione dell'evento di invio del form
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    clearAllMessages();

    const name = nameInput.value.trim();
    const surname = surnameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const role = roleInput.value.trim();

    let hasError = false;

    // Validazione dei campi
    if (!name) {
        showFieldError(nameInput, 'Per favore inserisci il tuo nome.');
        hasError = true;
    }
    if (!surname) {
        showFieldError(surnameInput, 'Per favore inserisci il tuo cognome.');
        hasError = true;
    }
    if (!email) {
        showFieldError(emailInput, 'Per favore inserisci una email valida.');
        hasError = true;
    }
    if (!password) {
        showFieldError(passwordInput, 'Per favore inserisci una password.');
        hasError = true;
    }
    if (!role) {
        showFieldError(roleInput, 'Per favore inserisci il tuo ruolo.');
        hasError = true;
    }

    if (hasError) {
        return;
    }

    // Disabilita il pulsante e mostra un messaggio di caricamento
    signupButton.disabled = true;
    signupButton.textContent = 'Registrazione in corso...';
    showGeneralMessage('Registrazione in corso...', 'message-info');

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, surname, email, password, role })
        });
        
        const result = await response.json();

        if (response.ok && result.status === 'success') {
            showGeneralMessage(result.message || 'Registrazione avvenuta con successo!', 'success');
        } else {
            // Gestione errori specifici dal backend
            if (result.errors) {
                if (result.errors.name) showFieldError(nameInput, result.errors.name);
                if (result.errors.surname) showFieldError(surnameInput, result.errors.surname);
                if (result.errors.email) showFieldError(emailInput, result.errors.email);
                if (result.errors.password) showFieldError(passwordInput, result.errors.password);
                if (result.errors.role) showFieldError(roleInput, result.errors.role);
                showGeneralMessage('Si sono verificati degli errori. Per favore, correggi i campi.', 'error');
            } else {
                showGeneralMessage(result.message || 'Errore durante la registrazione. Riprova più tardi.', 'error');
            }
        }
    } catch (error) {
        console.error('Errore di rete:', error);
        showGeneralError('Errore di rete. Riprova più tardi.');
    } finally {
        signupButton.disabled = false;
        signupButton.textContent = 'Signup';
    }
});
