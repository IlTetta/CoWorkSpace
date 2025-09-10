// src/backend/services/PaymentService.js
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Space = require('../models/Space');
const Location = require('../models/Location');
const AppError = require('../utils/AppError');
const db = require('../config/db');

/**
 * Service per gestire la logica di business dei pagamenti
 */
class PaymentService {
    /**
     * Crea un nuovo pagamento con validazioni e business logic
     * @param {Object} currentUser - Utente che fa la richiesta
     * @param {Object} paymentData - Dati del pagamento
     * @returns {Promise<Payment>} - Pagamento creato
     */
    static async createPayment(currentUser, paymentData) {
        // Verifica che l'utente sia autenticato
        if (!currentUser || !currentUser.user_id) {
            throw AppError.unauthorized('Utente non autenticato');
        }

        const { booking_id, amount, payment_method, transaction_id } = paymentData;

        // Verifica che la prenotazione esista
        const booking = await Booking.findById(booking_id);
        if (!booking) {
            throw AppError.notFound('Prenotazione non trovata');
        }

        // Verifica autorizzazione: proprietario della prenotazione o manager/admin
        if (currentUser.role === 'user' && booking.user_id !== currentUser.user_id) {
            throw AppError.forbidden('Non puoi creare un pagamento per questa prenotazione');
        }

        // I manager possono processare pagamenti per clienti delle proprie location
        // Questo include:
        // - Pagamenti in contanti alla reception
        // - Assistenza clienti con problemi di pagamento
        // - Processare pagamenti per conto di clienti
        if (currentUser.role === 'manager' && booking.user_id !== currentUser.user_id) {
            // Verifica che il manager gestisca la location del booking
            const space = await Space.findById(booking.space_id);
            if (!space) {
                throw AppError.badRequest('Spazio della prenotazione non trovato');
            }
            
            // Verifica attraverso la location
            const location = await Location.findById(space.location_id);
            if (!location || location.manager_id !== currentUser.user_id) {
                throw AppError.forbidden('Puoi processare pagamenti solo per prenotazioni delle tue location');
            }
        }

        // Verifica che non esista già un pagamento per questa prenotazione
        const existingPayment = await Payment.findByBookingId(booking_id);
        if (existingPayment) {
            if (existingPayment.status === 'completed') {
                throw AppError.conflict('Questa prenotazione ha già un pagamento completato');
            }
            if (existingPayment.status === 'pending') {
                throw AppError.conflict('Questa prenotazione ha già un pagamento in corso');
            }
        }

        // Verifica che l'importo corrisponda al prezzo della prenotazione
        if (parseFloat(amount) !== parseFloat(booking.total_price)) {
            throw AppError.badRequest(
                `L'importo del pagamento (${amount}) non corrisponde al prezzo totale della prenotazione (${booking.total_price})`
            );
        }

        // Usa una transazione per creare il pagamento e aggiornare la prenotazione
        const { pool } = db;
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Crea il pagamento
            const payment = await Payment.create({
                booking_id,
                amount,
                payment_method,
                status: 'completed',
                transaction_id
            });

            // Aggiorna lo stato della prenotazione
            await Booking.update(booking_id, { status: 'confirmed' });

            await client.query('COMMIT');

            // Ricarica il pagamento con tutti i dati correlati
            return await Payment.findById(payment.payment_id);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Ottiene pagamenti con filtri basati sui permessi utente
     * @param {Object} currentUser - Utente che fa la richiesta
     * @param {Object} filters - Filtri di ricerca
     * @returns {Promise<Array<Payment>>} - Array di pagamenti
     */
    static async getPayments(currentUser, filters = {}) {
        if (!currentUser || !currentUser.user_id) {
            throw AppError.unauthorized('Utente non autenticato');
        }

        // Applica filtri basati sul ruolo
        const roleFilters = { ...filters };

        switch (currentUser.role) {
            case 'user':
                // Gli utenti vedono solo i propri pagamenti
                roleFilters.user_id = currentUser.user_id;
                break;
            
            case 'manager':
                // I manager vedono solo i pagamenti delle loro location
                roleFilters.manager_id = currentUser.user_id;
                break;
            
            case 'admin':
                // Gli admin vedono tutti i pagamenti (nessun filtro aggiuntivo)
                break;
            
            default:
                throw AppError.forbidden('Ruolo non autorizzato');
        }

        return await Payment.findAll(roleFilters);
    }

    /**
     * Ottiene dettagli di un pagamento specifico
     * @param {Object} currentUser - Utente che fa la richiesta
     * @param {number} paymentId - ID del pagamento
     * @returns {Promise<Payment>} - Pagamento trovato
     */
    static async getPaymentDetails(currentUser, paymentId) {
        if (!currentUser || !currentUser.user_id) {
            throw AppError.unauthorized('Utente non autenticato');
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            throw AppError.notFound('Pagamento non trovata');
        }

        // Verifica autorizzazione
        switch (currentUser.role) {
            case 'user':
                // Gli utenti possono vedere solo i propri pagamenti
                if (payment.booking.user_id !== currentUser.user_id) {
                    throw AppError.forbidden('Non puoi visualizzare questo pagamento');
                }
                break;
            
            case 'manager':
                // I manager possono vedere solo pagamenti delle loro location
                if (payment.manager_id !== currentUser.user_id) {
                    throw AppError.forbidden('Non puoi visualizzare questo pagamento (non sei il manager della sede)');
                }
                break;
            
            case 'admin':
                // Gli admin possono vedere tutti i pagamenti
                break;
            
            default:
                throw AppError.forbidden('Ruolo non autorizzato');
        }

        return payment;
    }

    /**
     * Aggiorna lo stato di un pagamento
     * @param {Object} currentUser - Utente che fa la richiesta
     * @param {number} paymentId - ID del pagamento
     * @param {Object} updateData - Dati da aggiornare
     * @returns {Promise<Payment>} - Pagamento aggiornato
     */
    static async updatePaymentStatus(currentUser, paymentId, updateData) {
        if (!currentUser || !currentUser.user_id) {
            throw AppError.unauthorized('Utente non autenticato');
        }

        // Solo manager e admin possono aggiornare lo stato dei pagamenti
        if (!['manager', 'admin'].includes(currentUser.role)) {
            throw AppError.forbidden('Non hai il permesso per aggiornare lo stato dei pagamenti');
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            throw AppError.notFound('Pagamento non trovato');
        }

        // Verifica autorizzazione per manager
        if (currentUser.role === 'manager' && payment.manager_id !== currentUser.user_id) {
            throw AppError.forbidden('Non puoi modificare lo stato di questo pagamento (non sei il manager della sede)');
        }

        // Usa una transazione per aggiornare pagamento e prenotazione
        const { pool } = db;
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Aggiorna il pagamento
            const updatedPayment = await Payment.update(paymentId, updateData);

            // Aggiorna lo stato della prenotazione in base al nuovo stato del pagamento
            let bookingStatus;
            switch (updateData.status) {
                case 'completed':
                    bookingStatus = 'confirmed';
                    break;
                case 'failed':
                case 'refunded':
                    bookingStatus = 'cancelled';
                    break;
                default:
                    bookingStatus = null;
            }

            if (bookingStatus) {
                await Booking.update(payment.booking_id, { status: bookingStatus });
            }

            await client.query('COMMIT');

            // Ricarica il pagamento con tutti i dati aggiornati
            return await Payment.findById(paymentId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Elimina un pagamento
     * @param {Object} currentUser - Utente che fa la richiesta
     * @param {number} paymentId - ID del pagamento
     * @returns {Promise<boolean>} - True se eliminato
     */
    static async deletePayment(currentUser, paymentId) {
        if (!currentUser || !currentUser.user_id) {
            throw AppError.unauthorized('Utente non autenticato');
        }

        // Solo admin può eliminare pagamenti
        if (currentUser.role !== 'admin') {
            throw AppError.forbidden('Solo gli admin possono eliminare pagamenti');
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            throw AppError.notFound('Pagamento non trovato');
        }

        // Usa una transazione per eliminare il pagamento e aggiornare la prenotazione
        const { pool } = db;
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Elimina il pagamento
            const deleted = await Payment.delete(paymentId);
            
            // Aggiorna lo stato della prenotazione
            await Booking.update(payment.booking_id, { status: 'pending' });

            await client.query('COMMIT');

            return deleted;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Calcola statistiche pagamenti per dashboard
     * @param {Object} currentUser - Utente che fa la richiesta
     * @param {Object} filters - Filtri per le statistiche
     * @returns {Promise<Object>} - Statistiche
     */
    static async getPaymentStatistics(currentUser, filters = {}) {
        if (!currentUser || !currentUser.user_id) {
            throw AppError.unauthorized('Utente non autenticato');
        }

        // Solo manager e admin possono vedere le statistiche
        if (!['manager', 'admin'].includes(currentUser.role)) {
            throw AppError.forbidden('Non hai il permesso per visualizzare le statistiche');
        }

        // Applica filtri basati sul ruolo
        const roleFilters = { ...filters };
        if (currentUser.role === 'manager') {
            roleFilters.manager_id = currentUser.user_id;
        }

        const payments = await Payment.findAll(roleFilters);

        // Calcola statistiche
        const stats = {
            total_payments: payments.length,
            total_revenue: 0,
            completed_payments: 0,
            failed_payments: 0,
            refunded_payments: 0,
            payment_methods: {},
            monthly_revenue: {}
        };

        payments.forEach(payment => {
            const amount = parseFloat(payment.amount);
            
            // Revenue totale
            if (payment.status === 'completed') {
                stats.total_revenue += amount;
                stats.completed_payments++;
            }
            
            // Conteggi per stato
            if (payment.status === 'failed') stats.failed_payments++;
            if (payment.status === 'refunded') stats.refunded_payments++;
            
            // Conteggi per metodo di pagamento
            if (!stats.payment_methods[payment.payment_method]) {
                stats.payment_methods[payment.payment_method] = 0;
            }
            stats.payment_methods[payment.payment_method]++;
            
            // Revenue mensile
            const month = new Date(payment.payment_date).toISOString().substring(0, 7); // YYYY-MM
            if (!stats.monthly_revenue[month]) {
                stats.monthly_revenue[month] = 0;
            }
            if (payment.status === 'completed') {
                stats.monthly_revenue[month] += amount;
            }
        });

        return stats;
    }

    /**
     * Verifica se una prenotazione può essere pagata
     * @param {number} bookingId - ID della prenotazione
     * @returns {Promise<Object>} - Risultato della verifica
     */
    static async canPayBooking(bookingId) {
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            throw AppError.notFound('Prenotazione non trovata');
        }

        const existingPayment = await Payment.findByBookingId(bookingId);
        
        return {
            can_pay: !existingPayment || existingPayment.status === 'failed',
            booking,
            existing_payment: existingPayment,
            message: existingPayment 
                ? `Esiste già un pagamento con stato: ${existingPayment.status}`
                : 'La prenotazione può essere pagata'
        };
    }
}

module.exports = PaymentService;
