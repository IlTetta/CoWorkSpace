const state = {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedDate: null,
    loading: false
};

// Riferimenti agli elementi DOM
const calendarYearSelect = document.getElementById('calendar-year');
const calendarMonthSelect = document.getElementById('calendar-month');
const calendarDayNumbersEl = document.getElementById('calendar-day-numbers');
const dateInput = document.getElementById('date');
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
    const startDay = firstDay.getDay(); // 0 = Domenica, 1 = Lunedì

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

        if (fullDate.getTime() === today.getTime()) {
            dayEl.classList.add('calendar__day-number--current');
        }

        if (fullDate < today) {
            dayEl.classList.add('calendar__day-number--disabled');
            dayEl.style.pointerEvents = 'none';
            dayEl.style.opacity = '0.5';
        } else {
            dayEl.addEventListener('click', () => {
                const allDays = calendarDayNumbersEl.querySelectorAll('.calendar__day-number');
                // Se il giorno è già selezionato, deseleziona
                if (dayEl.classList.contains('selected')) {
                    dayEl.classList.remove('selected');
                    state.selectedDate = null;
                    dateInput.value = '';
                } else {
                    allDays.forEach(d => d.classList.remove('selected'));
                    dayEl.classList.add('selected');
                    state.selectedDate = fullDate;
                    dateInput.value = fullDate.toLocaleDateString('it-IT');
                }
            });
        }
        calendarDayNumbersEl.appendChild(dayEl);
    }
};


// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    populateSelects();
    renderCalendar(state.currentMonth, state.currentYear);
});

calendarYearSelect.addEventListener('change', (e) => {
    state.currentYear = parseInt(e.target.value, 10);
    renderCalendar(state.currentMonth, state.currentYear);
});

calendarMonthSelect.addEventListener('change', (e) => {
    state.currentMonth = parseInt(e.target.value, 10);
    renderCalendar(state.currentMonth, state.currentYear);
});

bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(bookingForm);
    const bookingData = {
        date: formData.get('date'),
        time: formData.get('time'),
        duration: formData.get('duration')
    };

    saveBookingToFirestore(bookingData);
});
