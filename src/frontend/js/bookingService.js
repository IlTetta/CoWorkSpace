// Booking Service per gestire le prenotazioni
class BookingService {
    constructor() {
        this.apiService = apiService;
    }

    // Ottieni tutte le prenotazioni dell'utente corrente
    async getUserBookings() {
        try {
            const user = authService.getUser();
            if (!user) {
                throw new Error('Utente non autenticato');
            }
            
            const bookings = await this.apiService.getAllBookings({ user_id: user.user_id });
            return bookings;
        } catch (error) {
            console.error('Errore nel recupero delle prenotazioni utente:', error);
            throw error;
        }
    }

    // Ottieni prenotazioni per una specifica location
    async getLocationBookings(locationId) {
        try {
            const spaces = await this.apiService.getAllSpaces({ location_id: locationId });
            const spaceIds = spaces.map(space => space.space_id);
            
            // Ottieni prenotazioni per tutti gli spazi di questa location
            const allBookings = [];
            for (const spaceId of spaceIds) {
                const spaceBookings = await this.apiService.getAllBookings({ space_id: spaceId });
                allBookings.push(...spaceBookings);
            }
            
            return allBookings;
        } catch (error) {
            console.error('Errore nel recupero delle prenotazioni per location:', error);
            throw error;
        }
    }

    // Crea una nuova prenotazione
    async createBooking(bookingData) {
        try {
            // Validazione dati
            const requiredFields = ['space_id', 'booking_date', 'start_time', 'end_time'];
            for (const field of requiredFields) {
                if (!bookingData[field]) {
                    throw new Error(`Campo ${field} è richiesto`);
                }
            }

            // Aggiungi l'ID utente corrente
            const user = authService.getUser();
            if (!user) {
                throw new Error('Utente non autenticato');
            }
            
            bookingData.user_id = user.user_id;

            // Calcola le ore totali e il prezzo
            const calculatedData = await this.calculateBookingPrice(bookingData);
            
            const booking = await this.apiService.createBooking(calculatedData);
            return booking;
        } catch (error) {
            console.error('Errore nella creazione della prenotazione:', error);
            throw error;
        }
    }

    // Calcola il prezzo della prenotazione
    async calculateBookingPrice(bookingData) {
        try {
            const space = await this.apiService.getSpaceById(bookingData.space_id);
            
            // Calcola ore totali
            const startTime = new Date(`2000-01-01T${bookingData.start_time}`);
            const endTime = new Date(`2000-01-01T${bookingData.end_time}`);
            const diffMs = endTime - startTime;
            const totalHours = diffMs / (1000 * 60 * 60);

            // Determina se usare prezzo orario o giornaliero
            let totalPrice;
            if (totalHours >= 8) {
                // Usa prezzo giornaliero se >= 8 ore
                totalPrice = space.price_per_day;
            } else {
                // Usa prezzo orario
                totalPrice = space.price_per_hour * totalHours;
            }

            return {
                ...bookingData,
                total_hours: totalHours,
                total_price: totalPrice
            };
        } catch (error) {
            console.error('Errore nel calcolo del prezzo:', error);
            throw error;
        }
    }

    // Cancella una prenotazione
    async cancelBooking(bookingId) {
        try {
            const booking = await this.apiService.getBookingById(bookingId);
            
            // Controlla se l'utente può cancellare questa prenotazione
            const user = authService.getUser();
            if (!user) {
                throw new Error('Utente non autenticato');
            }
            
            if (booking.user_id !== user.user_id && !authService.isAdmin()) {
                throw new Error('Non autorizzato a cancellare questa prenotazione');
            }

            // Update status a 'cancelled'
            const updatedBooking = await this.apiService.updateBooking(bookingId, {
                status: 'cancelled'
            });
            
            return updatedBooking;
        } catch (error) {
            console.error('Errore nella cancellazione della prenotazione:', error);
            throw error;
        }
    }

    // Controlla disponibilità di uno spazio
    async checkSpaceAvailability(spaceId, date, startTime, endTime) {
        try {
            // Ottieni tutte le prenotazioni per questo spazio nella data specificata
            const bookings = await this.apiService.getAllBookings({
                space_id: spaceId,
                booking_date: date
            });

            // Controlla sovrapposizioni
            const requestStart = new Date(`${date}T${startTime}`);
            const requestEnd = new Date(`${date}T${endTime}`);

            for (const booking of bookings) {
                if (booking.status === 'cancelled') continue;
                
                const bookingStart = new Date(`${booking.booking_date}T${booking.start_time}`);
                const bookingEnd = new Date(`${booking.booking_date}T${booking.end_time}`);

                // Controlla sovrapposizione
                if (requestStart < bookingEnd && requestEnd > bookingStart) {
                    return {
                        available: false,
                        conflictingBooking: booking
                    };
                }
            }

            return { available: true };
        } catch (error) {
            console.error('Errore nel controllo disponibilità:', error);
            throw error;
        }
    }

    // Formatta prenotazione per visualizzazione
    formatBookingForDisplay(booking) {
        return {
            ...booking,
            formattedDate: FrontendUtils.formatDate(booking.booking_date),
            formattedStartTime: FrontendUtils.formatTime(booking.start_time),
            formattedEndTime: FrontendUtils.formatTime(booking.end_time),
            formattedPrice: FrontendUtils.formatCurrency(booking.total_price),
            statusText: this.getStatusText(booking.status)
        };
    }

    // Ottieni testo status
    getStatusText(status) {
        const statusMap = {
            'pending': 'In attesa',
            'confirmed': 'Confermata',
            'cancelled': 'Cancellata',
            'completed': 'Completata'
        };
        return statusMap[status] || status;
    }
}

// Crea istanza globale
const bookingService = new BookingService();

// UI Functions for booking management
const BookingUI = {
    // Renderizza lista prenotazioni
    renderBookingsList: (bookings, containerId = 'bookings-list') => {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Booking list container not found');
            return;
        }

        if (!bookings || bookings.length === 0) {
            container.innerHTML = '<div class="no-bookings">Nessuna prenotazione trovata</div>';
            return;
        }

        const bookingsHtml = bookings.map(booking => {
            const formatted = bookingService.formatBookingForDisplay(booking);
            return `
                <div class="booking-card" data-booking-id="${booking.booking_id}">
                    <div class="booking-header">
                        <h3>${formatted.space_name || 'Spazio'}</h3>
                        <span class="booking-status status-${booking.status}">${formatted.statusText}</span>
                    </div>
                    <div class="booking-details">
                        <p><strong>Data:</strong> ${formatted.formattedDate}</p>
                        <p><strong>Orario:</strong> ${formatted.formattedStartTime} - ${formatted.formattedEndTime}</p>
                        <p><strong>Durata:</strong> ${booking.total_hours} ore</p>
                        <p><strong>Prezzo:</strong> ${formatted.formattedPrice}</p>
                    </div>
                    <div class="booking-actions">
                        ${booking.status === 'pending' || booking.status === 'confirmed' ? 
                            `<button class="btn-cancel" onclick="BookingUI.cancelBooking(${booking.booking_id})">Cancella</button>` : 
                            ''}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = bookingsHtml;
    },

    // Cancella prenotazione con conferma
    cancelBooking: async (bookingId) => {
        if (!confirm('Sei sicuro di voler cancellare questa prenotazione?')) {
            return;
        }

        try {
            await bookingService.cancelBooking(bookingId);
            FrontendUtils.showSuccess('Prenotazione cancellata con successo');
            
            // Ricarica la lista
            BookingUI.loadUserBookings();
        } catch (error) {
            FrontendUtils.showError('Errore nella cancellazione: ' + error.message);
        }
    },

    // Carica prenotazioni utente
    loadUserBookings: async () => {
        try {
            const bookings = await bookingService.getUserBookings();
            BookingUI.renderBookingsList(bookings);
        } catch (error) {
            console.error('Errore nel caricamento prenotazioni:', error);
            FrontendUtils.showError('Errore nel caricamento delle prenotazioni');
        }
    },

    // Gestisci form nuova prenotazione
    handleBookingForm: () => {
        const bookingForm = document.getElementById('booking-form');
        if (!bookingForm) return;

        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(bookingForm);
            const bookingData = Object.fromEntries(formData);

            try {
                // Controlla disponibilità prima di prenotare
                const availability = await bookingService.checkSpaceAvailability(
                    bookingData.space_id,
                    bookingData.booking_date,
                    bookingData.start_time,
                    bookingData.end_time
                );

                if (!availability.available) {
                    FrontendUtils.showError('Spazio non disponibile nell\'orario selezionato');
                    return;
                }

                const booking = await bookingService.createBooking(bookingData);
                FrontendUtils.showSuccess('Prenotazione creata con successo!');
                
                // Reset form
                bookingForm.reset();
                
                // Redirect o aggiorna UI
                setTimeout(() => {
                    window.location.href = '/bookings.html';
                }, 1000);

            } catch (error) {
                FrontendUtils.showError('Errore nella prenotazione: ' + error.message);
            }
        });
    }
};

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    BookingUI.handleBookingForm();
    
    // Carica prenotazioni se siamo nella pagina bookings
    if (window.location.pathname.includes('bookings')) {
        BookingUI.loadUserBookings();
    }
});
