// Funzione per mostrare messaggi all'interno del modal
function showModalMessage(message, type) {
    const messageElement = document.getElementById('modal-message');
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = `message ${type}-message`;
        if (type === "error") messageElement.style.color = "red";
    }
}

// Funzione per aprire il modal
document.querySelector(".forgot-password-link").addEventListener("click", function(e) {
    e.preventDefault();
    document.getElementById("forgot-password-modal").style.display = "block";
    showModalMessage("", "");
});

// Funzione per chiudere il modal con la X
document.querySelector(".close-button").addEventListener("click", function() {
    document.getElementById("forgot-password-modal").style.display = "none";
});

// Chiudi cliccando fuori dal contenuto
window.addEventListener("click", function(e) {
    if (e.target === document.getElementById("forgot-password-modal")) {
        document.getElementById("forgot-password-modal").style.display = "none";
    }
});

// Gestione invio link reset password
document.getElementById("send-reset-link-button").addEventListener("click", function() {
    const emailInput = document.getElementById("forgot-password-email");
    const email = emailInput.value.trim();
    const messageEl = document.getElementById("modal-message");

    if (messageEl) messageEl.textContent = "";

    if (!email) {
        if (messageEl) {
            messageEl.textContent = "Per favore inserisci una email valida.";
            messageEl.style.color = "red";
        }
        return;
    }

    const apiEndpoint = 'http://localhost:3000/api/users/request-password-reset';
    
    fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            messageEl.textContent = "Link di reset inviato con successo!";
            messageEl.style.color = "green";
        } else {
            messageEl.textContent = data.message || "Si è verificato un errore.";
            messageEl.style.color = "red";
        }
    })
    .catch(err => {
        messageEl.textContent = "Errore di connessione al server.";
        messageEl.style.color = "red";
        console.error(err);
    });
});

// gestione di reset e login
const loginButton = document.querySelector('.login-button');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const rememberMeCheckbox = document.getElementById('remember-me');
const API_URL = 'http://localhost:3000';

// Carica username salvato se presente
window.addEventListener('DOMContentLoaded', () => {
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername) {
        usernameInput.value = savedUsername;
        rememberMeCheckbox.checked = true;
    }
});

// Messaggi sotto i campi input
function showFieldError(input, message) {
    let errorEl = input.parentElement.nextElementSibling;
    if (!errorEl || !errorEl.classList.contains('field-error')) {
        errorEl = document.createElement('span');
        errorEl.className = 'field-error';
        input.parentElement.parentElement.insertBefore(errorEl, input.parentElement.nextSibling);
    }
    errorEl.textContent = message;
    errorEl.style.color = 'red';
    errorEl.style.display = 'block';
    errorEl.style.marginTop = '5px';
    errorEl.style.fontSize = '14px';
}

function clearFieldError(input) {
    const errorEl = input.parentElement.nextElementSibling;
    if (errorEl && errorEl.classList.contains('field-error')) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }
}

// Messaggi generali sotto il pulsante login
function showGeneralError(message) {
    let errorContainer = document.querySelector('.login-error-container');
    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.className = 'login-error-container';
        errorContainer.style.color = 'red';
        errorContainer.style.marginTop = '10px';
        errorContainer.style.fontSize = '14px';
        loginButton.parentElement.appendChild(errorContainer);
    }
    errorContainer.textContent = message;
}

function clearGeneralError() {
    const errorContainer = document.querySelector('.login-error-container');
    if (errorContainer) errorContainer.textContent = '';
}

// Gestione login con fetch e form
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldError(usernameInput);
    clearFieldError(passwordInput);
    clearGeneralError();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    let hasError = false;
    if (!username) {
        showFieldError(usernameInput, 'Per favore inserisci lo username.');
        hasError = true;
    }
    if (!password) {
        showFieldError(passwordInput, 'Per favore inserisci la password.');
        hasError = true;
    }
    if (hasError) return;

    loginButton.disabled = true;
    loginButton.textContent = 'Accesso...';

    try {
        console.log('Tentativo di login con:', { email: username, password: '***' });
        console.log('URL API:', `${API_URL}/api/users/login`);
        
        const response = await fetch(`${API_URL}/api/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: username, password }),
        });

        console.log('Risposta ricevuta:', response.status, response.statusText);
        const result = await response.json();
        console.log('Dati della risposta:', result);

        if (response.ok && result.status === 'success') {
            // Salva username se "Remember Me" selezionato
            if (rememberMeCheckbox.checked) {
                localStorage.setItem('rememberedUsername', username);
            } else {
                localStorage.removeItem('rememberedUsername');
            }

            if (result.data && result.data.requiresPasswordReset) {
                localStorage.setItem('coworkspace_token', result.data.token);
                window.location.href = `reset-password.html?requiresPasswordReset=true`;
            } else {
                // Salva token direttamente
                localStorage.setItem('coworkspace_token', result.data.token);
                if (result.data.user) {
                    localStorage.setItem('coworkspace_user', JSON.stringify(result.data.user));
                }
                
                // Redirect diretto
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1000);
            }
        } else {
            if (result.errors) {
                if (result.errors.email) showFieldError(usernameInput, result.errors.email);
                if (result.errors.password) showFieldError(passwordInput, result.errors.password);
            } else {
                showGeneralError(result.message || 'Credenziali non valide.');
            }
        }
    } catch (error) {
        console.error('Errore API completo:', error);
        console.error('Tipo di errore:', error.name);
        console.error('Messaggio errore:', error.message);
        console.error('Stack trace:', error.stack);
        showGeneralError(`Errore di rete: ${error.message}`);
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'Login';
    }
});

// Gestione del pulsante Signup per redirect a signup.html
document.addEventListener('DOMContentLoaded', () => {
    const signupButton = document.querySelector('.signup-button');
    if (signupButton) {
        signupButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'signup.html';
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
