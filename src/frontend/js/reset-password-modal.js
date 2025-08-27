// Ottieni riferimenti agli elementi del DOM
const forgotPasswordLink = document.getElementById('forgot-password-action');
const modal = document.getElementById('forgot-password-modal');
const closeModalBtn = document.getElementById('close-modal');
const sendResetLinkBtn = document.getElementById('send-reset-link-button');
const emailInput = document.getElementById('forgot-password-email');
const modalMessage = document.getElementById('modal-message');

// Endpoint API (da sostituire con il tuo URL reale)
const API_URL = 'http://localhost:3000';

/**
 * Funzione per mostrare messaggi all'interno del modale.
 * @param {string} message Il messaggio da visualizzare.
 * @param {string} type Il tipo di messaggio ('success' o 'error').
 */
function displayModalMessage(message, type) {
    modalMessage.textContent = message;
    modalMessage.className = `message ${type}`;
}

// Evento per mostrare il modale quando si clicca sul link "Forgot the password?"
forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault(); // Impedisce al link di reindirizzare la pagina
    modal.style.display = 'block';
    displayModalMessage('', ''); // Pulisce i messaggi precedenti
});

// Evento per nascondere il modale quando si clicca sulla "X"
closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Nasconde il modale se l'utente clicca fuori dal suo contenuto
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Evento per gestire la richiesta di reset password
sendResetLinkBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    if (!email) {
        displayModalMessage('Per favore, inserisci la tua email.', 'error');
        return;
    }

    // Disabilita il pulsante per evitare click multipli
    sendResetLinkBtn.disabled = true;
    sendResetLinkBtn.textContent = 'Invio...';
    displayModalMessage('Invio in corso...', 'message-info');

    try {
        const response = await fetch(`${API_URL}/api/users/request-password-reset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
            displayModalMessage(result.message || 'Se l\'email è registrata, riceverai a breve le istruzioni per il reset.', 'success');
        } else {
            displayModalMessage(result.message || 'Errore durante l\'invio.', 'error');
        }
    } catch (error) {
        console.error('Errore API:', error);
        displayModalMessage('Errore di rete. Riprova più tardi.', 'error');
    } finally {
        sendResetLinkBtn.disabled = false;
        sendResetLinkBtn.textContent = 'Invia link di reset';
    }
});
