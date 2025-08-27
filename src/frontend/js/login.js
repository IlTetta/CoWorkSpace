// Funzione per mostrare messaggi all'interno del modal
function showModalMessage(message, type) {
    const messageElement = document.getElementById('modal-message');
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = `message ${type}-message`;
    }
}

// Funzione per aprire il modal
document.querySelector(".forgot-password-link").addEventListener("click", function(e) {
    e.preventDefault();
    document.getElementById("forgot-password-modal").style.display = "block";
    showModalMessage("", ""); // Pulisce i messaggi precedenti
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

    // Reset messaggio
    if (messageEl) {
        messageEl.textContent = "";
    }

    if (!email) {
        if (messageEl) {
            messageEl.textContent = "Per favore inserisci una email valida.";
            messageEl.style.color = "red";
        }
        return;
    }

    // Invio richiesta al backend
    // Da ricontrollare, non sono sicuro l'indirizzo sia gusto
    const apiEndpoint = 'http://localhost:3000/api/users/request-password-reset';
    
    fetch(apiEndpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (messageEl) {
                messageEl.textContent = "Link di reset inviato con successo!";
                messageEl.style.color = "green";
            }
        } else {
            if (messageEl) {
                messageEl.textContent = data.message || "Si è verificato un errore.";
                messageEl.style.color = "red";
            }
        }
    })
    .catch(err => {
        if (messageEl) {
            messageEl.textContent = "Errore di connessione al server.";
            messageEl.style.color = "red";
        }
        console.error(err);
    });
});

// gestione di reset

// Ottieni riferimenti agli elementi del DOM
const loginButton = document.querySelector('.login-button');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// Endpoint API (da sostituire con il tuo URL reale)
const API_URL = 'http://localhost:3000';

// Funzione di utilità per mostrare messaggi
function showLoginMessage(message, type) {
    const messageContainer = document.querySelector('.panel');
    if (!messageContainer) return;
    
    let messageBox = messageContainer.querySelector('.message-box');
    if (!messageBox) {
        messageBox = document.createElement('div');
        messageBox.className = 'message-box';
        messageContainer.prepend(messageBox);
    }
    messageBox.textContent = message;
    messageBox.className = `message-box message-${type}`;
}

// Evento per gestire la sottomissione del form di login
loginButton.addEventListener('click', async () => {
    const username = usernameInput.value;
    const password = passwordInput.value;

    if (!username || !password) {
        showLoginMessage('Per favore, inserisci username e password.', 'error');
        return;
    }

    // Disabilita il pulsante per evitare click multipli
    loginButton.disabled = true;
    loginButton.textContent = 'Accesso...';
    showLoginMessage('Accesso in corso...', 'message-info');

    try {
        const response = await fetch(`${API_URL}/api/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: username, password }),
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
            // Login riuscito
            showLoginMessage(result.message, 'success');
            
            // Gestisci il caso in cui il backend richiede il reset della password
            if (result.data && result.data.requiresPasswordReset) {
                console.log('Login riuscito, ma la password deve essere resettata. Reindirizzamento...');
                // Salva il token JWT per la prossima pagina, ad esempio in localStorage
                localStorage.setItem('jwtToken', result.data.token);
                // Reindirizza l'utente alla pagina di cambio password
                window.location.href = `/reset-password.html?requiresPasswordReset=true`;
            } else {
                // Login riuscito, l'utente può accedere alla dashboard
                console.log('Login riuscito. Reindirizzamento alla dashboard...');
                // Salva il token e reindirizza
                localStorage.setItem('jwtToken', result.data.token);
                window.location.href = '/dashboard.html';
            }
        } else {
            // Login fallito
            showLoginMessage(result.message || 'Credenziali non valide.', 'error');
        }
    } catch (error) {
        console.error('Errore API:', error);
        showLoginMessage('Errore di rete. Riprova più tardi.', 'error');
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'Login';
    }
});
