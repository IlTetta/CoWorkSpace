// Riferimenti ai campi input
const signupForm = document.getElementById('signup-form');
const signupButton = document.querySelector('.signup-button');
const nameInput = document.getElementById('name'); // Corretto: da 'username' a 'name'
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

    // Rimuovi anche i messaggi di errore generali
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
        showFieldError(roleInput, 'Per favora inserisci il tuo ruolo.');
        hasError = true;
    }

    if (hasError) {
        return;
    }

    // Disabilita il pulsante e mostra un messaggio di caricamento
    signupButton.disabled = true;
    signupButton.textContent = 'Registrazione in corso...';
    // Visualizza il messaggio di caricamento sotto il pulsante
    showGeneralError('Registrazione in corso...');

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
            // Visualizza il messaggio di successo sotto il pulsante
            showGeneralError(result.message || 'Registrazione avvenuta con successo!');

            // Salva token se presente nella risposta
            if (result.data && result.data.token) {
                localStorage.setItem('jwtToken', result.data.token);
                if (result.data.user) {
                    localStorage.setItem('coworkspace_user', JSON.stringify(result.data.user));
                }

                // Redirect a home.html dopo registrazione con login automatico
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1500);
            } else {
                // Redirect a login se non c'è auto-login
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            }
        } else {
            // Gestione errori specifici dal backend
            if (result.errors) {
                if (result.errors.name) showFieldError(nameInput, result.errors.name);
                if (result.errors.surname) showFieldError(surnameInput, result.errors.surname);
                if (result.errors.email) showFieldError(emailInput, result.errors.email);
                if (result.errors.password) showFieldError(passwordInput, result.errors.password);
                if (result.errors.role) showFieldError(roleInput, result.errors.role);
                // Visualizza un messaggio generale sotto il pulsante
                showGeneralError('Si sono verificati degli errori. Per favore, correggi i campi.');
            } else {
                // Visualizza un messaggio di errore generale sotto il pulsante
                showGeneralError(result.message || 'Errore durante la registrazione. Riprova più tardi.');
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

// Gestione del pulsante Login per redirect a login.html e del logo per redirect a home.html
document.addEventListener('DOMContentLoaded', () => {
    // Gestisce il click sul pulsante di login
    const loginButton = document.querySelector('.login-button');
    if (loginButton) {
        loginButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'login.html';
        });
    }

    // Gestisce il click sul logo per reindirizzare a home.html
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'home.html';
        });
    }
});
