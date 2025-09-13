const state = {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedStartDate: null,
    selectedEndDate: null,
    selectingStartDate: true, // flag per sapere se stiamo selezionando inizio o fine
    loading: false
};

// Riferimenti agli elementi DOM
const calendarYearSelect = document.getElementById('calendar-year');
const calendarMonthSelect = document.getElementById('calendar-month');
const calendarDayNumbersEl = document.getElementById('calendar-day-numbers');
const dateStartInput = document.getElementById('date-start');
const dateEndInput = document.getElementById('date-end');
const bookingForm = document.getElementById('booking-form');
const bookingMessage = document.getElementById('booking-message');

// Funzione per mostrare un messaggio
const showMessage = (element, message, color) => {
    element.textContent = message;
    element.style.color = color;
};

// Popola i menu a tendina per mese e anno
const populateSelects = () => {
    const currentYear = new Date().getFullYear();
    const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

    for (let i = currentYear; i <= currentYear + 10; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        calendarYearSelect.appendChild(option);
    }

    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = month;
        calendarMonthSelect.appendChild(option);
    });

    calendarYearSelect.value = state.currentYear;
    calendarMonthSelect.value = state.currentMonth;
};

// Funzione per visualizzare il calendario
const renderCalendar = (month, year) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDay = firstDay.getDay(); // 0 = Domenica, 1 = Lunedì, ...
    
    // Converti per iniziare da lunedì (0 = Lunedì, 6 = Domenica)
    startDay = startDay === 0 ? 6 : startDay - 1;

    calendarDayNumbersEl.innerHTML = '';

    for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.classList.add('calendar__day-number');
        calendarDayNumbersEl.appendChild(emptyDay);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayEl = document.createElement('div');
        dayEl.classList.add('calendar__day-number');
        dayEl.textContent = day;

        const fullDate = new Date(year, month, day);
        fullDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Formato della data per confronto con le date prenotate (YYYY-MM-DD)
        const dateStr = fullDate.toISOString().split('T')[0];

        if (fullDate.getTime() === today.getTime()) {
            dayEl.classList.add('calendar__day-number--current');
        }

        // Disabilita le date nel passato
        if (fullDate < today) {
            dayEl.classList.add('calendar__day-number--disabled');
            dayEl.style.pointerEvents = 'none';
            dayEl.style.opacity = '0.5';
        }
        // Disabilita le date già prenotate per lo spazio selezionato
        else if (window.currentSpaceBookedDates && window.currentSpaceBookedDates.includes(dateStr)) {
            dayEl.classList.add('calendar__day-number--booked');
            dayEl.style.pointerEvents = 'none';
            dayEl.style.opacity = '0.6';
            dayEl.style.backgroundColor = '#ffebee';
            dayEl.style.color = '#c62828';
            dayEl.style.textDecoration = 'line-through';
            dayEl.title = 'Data già prenotata';
        }
        else {
            // Date selezionabili
            // Evidenzia le date selezionate
            if (state.selectedStartDate && fullDate.getTime() === state.selectedStartDate.getTime()) {
                dayEl.classList.add('selected-start');
            }
            if (state.selectedEndDate && fullDate.getTime() === state.selectedEndDate.getTime()) {
                dayEl.classList.add('selected-end');
            }
            
            // Evidenzia il range tra le date
            if (state.selectedStartDate && state.selectedEndDate && 
                fullDate >= state.selectedStartDate && fullDate <= state.selectedEndDate) {
                dayEl.classList.add('in-range');
            }

            dayEl.addEventListener('click', () => {
                selectDate(fullDate, dayEl);
            });
        }
        calendarDayNumbersEl.appendChild(dayEl);
    }
};

// Funzione per gestire la selezione delle date
const selectDate = (selectedDate, dayEl) => {
    const instructionText = document.getElementById('calendar-instruction-text');
    
    // Se stiamo selezionando la data di fine, controlla che non ci siano conflitti nel range
    if (!state.selectingStartDate && state.selectedStartDate && window.currentSpaceBookedDates) {
        const startDate = state.selectedStartDate;
        const actualStartDate = selectedDate < startDate ? selectedDate : startDate;
        const actualEndDate = selectedDate < startDate ? startDate : selectedDate;
        
        // Controlla se ci sono date prenotate nel range
        const currentDate = new Date(actualStartDate);
        let hasConflict = false;
        
        while (currentDate <= actualEndDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            if (window.currentSpaceBookedDates.includes(dateStr)) {
                hasConflict = true;
                break;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        if (hasConflict) {
            // Mostra messaggio di errore
            if (instructionText) {
                instructionText.textContent = 'Il periodo selezionato include date già prenotate. Scegli un altro periodo.';
                instructionText.style.color = '#e74c3c';
                
                setTimeout(() => {
                    instructionText.style.color = '';
                    instructionText.textContent = 'Clicca su una data per selezionare la fine del periodo';
                }, 3000);
            }
            return; // Non completare la selezione
        }
    }
    
    if (state.selectingStartDate || !state.selectedStartDate) {
        // Selezione data di inizio
        clearSelections();
        state.selectedStartDate = selectedDate;
        state.selectedEndDate = null;
        state.selectingStartDate = false;
        
        dayEl.classList.add('selected-start');
        dateStartInput.value = selectedDate.toLocaleDateString('it-IT');
        dateEndInput.value = '';
        
        if (instructionText) {
            instructionText.textContent = 'Ora clicca su una data per selezionare la fine del periodo';
        }
        
        // Trigger per aggiornare il prezzo
        if (window.updatePricePreview) {
            window.updatePricePreview();
        }
        
    } else {
        // Selezione data di fine
        if (selectedDate < state.selectedStartDate) {
            // Se la data di fine è prima di quella di inizio, scambia
            state.selectedEndDate = state.selectedStartDate;
            state.selectedStartDate = selectedDate;
        } else {
            state.selectedEndDate = selectedDate;
        }
        
        dateStartInput.value = state.selectedStartDate.toLocaleDateString('it-IT');
        dateEndInput.value = state.selectedEndDate.toLocaleDateString('it-IT');
        state.selectingStartDate = true; // Reset per la prossima selezione
        
        if (instructionText) {
            instructionText.textContent = 'Periodo selezionato! Clicca su "Data di inizio" per riselezionare';
        }
        
        // Trigger per aggiornare il prezzo
        if (window.updatePricePreview) {
            window.updatePricePreview();
        }
        
        // Re-render del calendario per mostrare il range
        renderCalendar(state.currentMonth, state.currentYear);
    }
};

// Funzione per pulire le selezioni
const clearSelections = () => {
    const allDays = calendarDayNumbersEl.querySelectorAll('.calendar__day-number');
    allDays.forEach(day => {
        day.classList.remove('selected-start', 'selected-end', 'in-range');
    });
};


// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    populateSelects();
    renderCalendar(state.currentMonth, state.currentYear);
    
    // Listener per pulire le selezioni quando si clicca sui campi input
    if (dateStartInput) {
        dateStartInput.addEventListener('click', () => {
            clearSelections();
            state.selectedStartDate = null;
            state.selectedEndDate = null;
            state.selectingStartDate = true;
            dateStartInput.value = '';
            dateEndInput.value = '';
            
            const instructionText = document.getElementById('calendar-instruction-text');
            if (instructionText) {
                instructionText.textContent = 'Clicca su una data per selezionare l\'inizio del periodo';
            }
            
            // Trigger per aggiornare il prezzo (reset)
            if (window.updatePricePreview) {
                window.updatePricePreview();
            }
            
            renderCalendar(state.currentMonth, state.currentYear);
        });
    }
    
    if (dateEndInput) {
        dateEndInput.addEventListener('click', () => {
            if (state.selectedStartDate) {
                state.selectingStartDate = false; // Forza selezione data di fine
                
                const instructionText = document.getElementById('calendar-instruction-text');
                if (instructionText) {
                    instructionText.textContent = 'Clicca su una data per selezionare la fine del periodo';
                }
            }
        });
    }
});

calendarYearSelect.addEventListener('change', (e) => {
    state.currentYear = parseInt(e.target.value, 10);
    renderCalendar(state.currentMonth, state.currentYear);
});

calendarMonthSelect.addEventListener('change', (e) => {
    state.currentMonth = parseInt(e.target.value, 10);
    renderCalendar(state.currentMonth, state.currentYear);
});

// ============================================================================
// FUNZIONI PER INTEGRAZIONE CON DISPONIBILITÀ SPAZI
// ============================================================================

/**
 * Funzione globale per aggiornare il calendario quando cambiano le date prenotate
 * Chiamata da workspace.js quando si seleziona uno spazio diverso
 */
window.updateCalendarAvailability = function() {
    // Re-render del calendario per applicare le nuove restrizioni
    renderCalendar(state.currentMonth, state.currentYear);
    
    // Verifica se le date attualmente selezionate sono ancora valide
    if (state.selectedStartDate && window.currentSpaceBookedDates) {
        const startDateStr = state.selectedStartDate.toISOString().split('T')[0];
        if (window.currentSpaceBookedDates.includes(startDateStr)) {
            // Data di inizio non più valida
            clearSelections();
            state.selectedStartDate = null;
            state.selectedEndDate = null;
            state.selectingStartDate = true;
            dateStartInput.value = '';
            dateEndInput.value = '';
            
            const instructionText = document.getElementById('calendar-instruction-text');
            if (instructionText) {
                instructionText.textContent = 'La data precedentemente selezionata non è più disponibile. Seleziona una nuova data.';
                instructionText.style.color = '#e74c3c';
                
                // Ripristina il colore dopo 3 secondi
                setTimeout(() => {
                    instructionText.style.color = '';
                    instructionText.textContent = 'Clicca su una data per selezionare l\'inizio del periodo';
                }, 3000);
            }
            
            renderCalendar(state.currentMonth, state.currentYear);
        }
    }
    
    if (state.selectedEndDate && window.currentSpaceBookedDates) {
        const endDateStr = state.selectedEndDate.toISOString().split('T')[0];
        if (window.currentSpaceBookedDates.includes(endDateStr)) {
            // Data di fine non più valida
            state.selectedEndDate = null;
            dateEndInput.value = '';
            renderCalendar(state.currentMonth, state.currentYear);
        }
    }
};
