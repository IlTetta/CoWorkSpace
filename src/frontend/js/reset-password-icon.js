document.addEventListener('DOMContentLoaded', () => {
    // Seleziona tutte le icone con la classe 'input-icon'
    const visibilityIcons = document.querySelectorAll('.input-icon');

    // Per ogni icona, aggiungi un ascoltatore di eventi al clic
    visibilityIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            // Trova il campo di input più vicino all'icona
            const inputContainer = icon.closest('.input-container');
            const passwordInput = inputContainer.querySelector('input');

            // Controlla il tipo di input e cambia l'icona
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.textContent = 'visibility';
            } else {
                passwordInput.type = 'password';
                icon.textContent = 'visibility_off';
            }
        });
    });
});