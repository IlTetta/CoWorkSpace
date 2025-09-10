document.addEventListener('DOMContentLoaded', () => {
    // Riferimenti ai campi input e al pulsante usando gli ID e le classi del tuo HTML
    const newPasswordInput = document.getElementById('new-password'); // Questo sarà per la password temporanea
    const confirmNewPasswordInput = document.getElementById('password'); // Questo sarà per la nuova password
    const changePasswordButton = document.querySelector('.password-button'); // Usiamo la classe dato che non ha un ID

    // URL dell'endpoint API per il cambio password
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

        const currentPassword = newPasswordInput.value.trim(); // Questo è la password temporanea
        const newPassword = confirmNewPasswordInput.value.trim(); // Questa è la nuova password

        let hasError = false;

        // Validazione dei campi
        if (!currentPassword) {
            showFieldError(newPasswordInput, 'Per favore, inserisci la password temporanea ricevuta via email.');
            hasError = true;
        }

        if (!newPassword) {
            showFieldError(confirmNewPasswordInput, 'Per favore, inserisci la nuova password.');
            hasError = true;
        }

        if (hasError) {
            return;
        }

        // Disabilita il pulsante e mostra un messaggio di caricamento
        changePasswordButton.disabled = true;
        changePasswordButton.textContent = 'Cambio in corso...';
        showGeneralStatus('Cambio in corso...', true);

        // Ottieni il token JWT dal localStorage (se l'utente è loggato)
        const token = localStorage.getItem('coworkspace_token');

        if (!token) {
            showGeneralStatus('Errore: Devi essere loggato per cambiare la password. Fai prima il login con la password temporanea.', false);
            changePasswordButton.disabled = false;
            changePasswordButton.textContent = 'Change Password';
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/users/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    currentPassword: currentPassword,  // Password temporanea
                    newPassword: newPassword           // Nuova password
                }),
            });

            const result = await response.json();

            if (response.ok && result.status === 'success') {
                showGeneralStatus('Password cambiata con successo!', true);
                setTimeout(() => {
                     window.location.href = 'login.html';
                }, 1500);
            } else {
                if (result.errors) {
                    if (result.errors.currentPassword) showFieldError(newPasswordInput, result.errors.currentPassword);
                    if (result.errors.newPassword) showFieldError(confirmNewPasswordInput, result.errors.newPassword);
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
