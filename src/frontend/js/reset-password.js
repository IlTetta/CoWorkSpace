document.addEventListener('DOMContentLoaded', () => {
    // Riferimenti ai campi input e al pulsante usando gli ID e le classi del tuo HTML
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('password'); // Corretto per usare l'ID del tuo HTML
    const changePasswordButton = document.querySelector('.password-button'); // Usiamo la classe dato che non ha un ID

    // URL dell'endpoint API per il reset della password
    const API_URL = 'http://localhost:3000';

    // Funzione per creare e mostrare un messaggio di errore sotto un campo specifico
    function showFieldError(input, message) {
        // Mostra l'errore nello span già presente sotto l'input
        let errorEl;
        if (input.id === 'new-password') {
            errorEl = document.getElementById('new-password-error');
        } else if (input.id === 'password') {
            errorEl = document.getElementById('confirm-password-error');
        }
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }

    // Funzione per cancellare un messaggio di errore sotto un campo specifico
    function clearFieldError(input) {
        let errorEl;
        if (input.id === 'new-password') {
            errorEl = document.getElementById('new-password-error');
        } else if (input.id === 'password') {
            errorEl = document.getElementById('confirm-password-error');
        }
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
    }

    // Funzione per mostrare messaggi di stato generali sotto il pulsante
    function showGeneralStatus(message, isSuccess) {
        let statusContainer = document.querySelector('.status-container');
        if (!statusContainer) {
            statusContainer = document.createElement('div');
            statusContainer.className = 'status-container';
            // Inserisci il contenitore dopo il pulsante
            changePasswordButton.parentElement.insertBefore(statusContainer, changePasswordButton.nextElementSibling);
        }
        statusContainer.textContent = message;
        statusContainer.classList.remove('success', 'error');
        if (isSuccess) {
            statusContainer.classList.add('success');
        } else {
            statusContainer.classList.add('error');
        }
    }
    
    // Funzione per cancellare tutti i messaggi
    function clearAllMessages() {
        const fieldErrors = document.querySelectorAll('.field-error');
        fieldErrors.forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
        const statusContainer = document.querySelector('.status-container');
        if (statusContainer) {
            statusContainer.textContent = '';
            statusContainer.classList.remove('success', 'error');
        }
    }

    // Gestione del click sul pulsante "Change Password"
    changePasswordButton.addEventListener('click', async () => {
        clearAllMessages();

        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmNewPasswordInput.value.trim();

        let hasError = false;

        // Validazione dei campi
        if (!newPassword) {
            showFieldError(newPasswordInput, 'Per favore, inserisci una password.');
            hasError = true;
        }

        if (!confirmPassword) {
            showFieldError(confirmNewPasswordInput, 'Per favore, conferma la password.');
            hasError = true;
        }

        if (newPassword && confirmPassword && newPassword !== confirmPassword) {
            showFieldError(confirmNewPasswordInput, 'Le password non corrispondono.');
            hasError = true;
        }

        if (hasError) {
            return;
        }

        // Disabilita il pulsante e mostra un messaggio di caricamento
        changePasswordButton.disabled = true;
        changePasswordButton.textContent = 'Cambio in corso...';
        showGeneralStatus('Cambio in corso...', true);

        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
            showGeneralStatus('Errore: Token di reset mancante.', false);
            changePasswordButton.disabled = false;
            changePasswordButton.textContent = 'Change Password';
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/users/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, newPassword, confirmPassword }),
            });

            const result = await response.json();

            if (response.ok && result.status === 'success') {
                showGeneralStatus('Password cambiata con successo!', true);
                setTimeout(() => {
                     window.location.href = '/login.html';
                }, 1500);
            } else {
                if (result.errors) {
                    if (result.errors.newPassword) showFieldError(newPasswordInput, result.errors.newPassword);
                    if (result.errors.confirmPassword) showFieldError(confirmNewPasswordInput, result.errors.confirmPassword);
                    showGeneralStatus('Si sono verificati degli errori. Per favore, correggi i campi.', false);
                } else {
                    showGeneralStatus(result.message || 'Si è verificato un errore. Riprova più tardi.', false);
                }
            }
        } catch (error) {
            console.error('Errore API:', error);
            showGeneralStatus('Errore di rete. Riprova più tardi.', false);
        } finally {
            changePasswordButton.disabled = false;
            changePasswordButton.textContent = 'Change Password';
        }
    });
});
