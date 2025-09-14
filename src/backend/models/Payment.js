// src/backend/models/Payment.js
const db = require('../config/db');
const AppError = require('../utils/AppError');

/**
 * Classe Payment per gestire i pagamenti
 */
class Payment {
    constructor(data) {
        this.payment_id = data.payment_id;
        this.booking_id = data.booking_id;
        this.amount = data.amount;
        this.payment_date = data.payment_date;
        this.payment_method = data.payment_method;
        this.status = data.status;
        this.transaction_id = data.transaction_id;
        
        // Campi aggiuntivi da JOIN queries
        if (data.booking_id) {
            this.booking = {
                id: data.booking_id,
                user_id: data.booking_user_id,
                space_id: data.space_id,
                start_date: data.start_date,
                end_date: data.end_date
            };
        }
        
        if (data.space_name) {
            this.space = {
                name: data.space_name,
                location_name: data.location_name
            };
        }
        
        if (data.user_name) {
            this.user = {
                name: data.user_name,
                surname: data.user_surname,
                email: data.user_email
            };
        }
    }

    /**
     * Crea un nuovo pagamento
     * @param {Object} paymentData - Dati del pagamento
     * @returns {Promise<Payment>} - Pagamento creato
     */
    static async create(paymentData) {
        const {
            booking_id,
            amount,
            payment_method,
            status = 'completed',
            transaction_id
        } = paymentData;

        // Validazione dati obbligatori
        this.validatePaymentData(paymentData);

        const { pool } = db;

        try {
            const query = `
                INSERT INTO payments (
                    booking_id, amount, payment_method, status, transaction_id
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            
            const values = [
                booking_id, amount, payment_method, status, transaction_id
            ];

            const result = await pool.query(query, values);
            return new Payment(result.rows[0]);
        } catch (error) {
            if (error.code === '23505') { // Unique violation
                if (error.constraint === 'payments_booking_id_key') {
                    throw AppError.conflict('Questa prenotazione ha già un pagamento associato');
                }
                if (error.constraint === 'payments_transaction_id_key') {
                    throw AppError.conflict('Transaction ID già esistente');
                }
            }
            throw AppError.internal('Errore durante la creazione del pagamento', error);
        }
    }

    /**
     * Trova un pagamento per ID
     * @param {number} paymentId - ID del pagamento
     * @returns {Promise<Payment|null>} - Pagamento trovato o null
     */
    static async findById(paymentId) {
        const { pool } = db;

        try {
            const query = `
                SELECT 
                    p.*,
                    b.user_id as booking_user_id,
                    b.space_id,
                    b.start_date,
                    b.end_date,
                    s.space_name,
                    l.location_name,
                    l.manager_id,
                    u.name as user_name,
                    u.surname as user_surname,
                    u.email as user_email
                FROM payments p
                JOIN bookings b ON p.booking_id = b.booking_id
                JOIN spaces s ON b.space_id = s.space_id
                JOIN locations l ON s.location_id = l.location_id
                JOIN users u ON b.user_id = u.user_id
                WHERE p.payment_id = $1
            `;

            const result = await pool.query(query, [paymentId]);
            return result.rows.length > 0 ? new Payment(result.rows[0]) : null;
        } catch (error) {
            throw AppError.internal('Errore durante la ricerca del pagamento', error);
        }
    }

    /**
     * Trova un pagamento per booking ID
     * @param {number} bookingId - ID della prenotazione
     * @returns {Promise<Payment|null>} - Pagamento trovato o null
     */
    static async findByBookingId(bookingId) {
        const { pool } = db;

        try {
            const query = `
                SELECT 
                    p.*,
                    b.user_id as booking_user_id,
                    b.space_id,
                    b.start_date,
                    b.end_date,
                    s.space_name,
                    l.location_name,
                    u.name as user_name,
                    u.surname as user_surname,
                    u.email as user_email
                FROM payments p
                JOIN bookings b ON p.booking_id = b.booking_id
                JOIN spaces s ON b.space_id = s.space_id
                JOIN locations l ON s.location_id = l.location_id
                JOIN users u ON b.user_id = u.user_id
                WHERE p.booking_id = $1
            `;

            const result = await pool.query(query, [bookingId]);
            return result.rows.length > 0 ? new Payment(result.rows[0]) : null;
        } catch (error) {
            throw AppError.internal('Errore durante la ricerca del pagamento per prenotazione', error);
        }
    }

    /**
     * Trova tutti i pagamenti con filtri
     * @param {Object} filters - Filtri di ricerca
     * @returns {Promise<Array<Payment>>} - Array di pagamenti
     */
    static async findAll(filters = {}) {
        const { pool } = db;

        try {
            let query = `
                SELECT 
                    p.*,
                    b.user_id as booking_user_id,
                    b.space_id,
                    b.start_date,
                    b.end_date,
                    s.space_name,
                    l.location_name,
                    l.manager_id,
                    u.name as user_name,
                    u.surname as user_surname,
                    u.email as user_email
                FROM payments p
                JOIN bookings b ON p.booking_id = b.booking_id
                JOIN spaces s ON b.space_id = s.space_id
                JOIN locations l ON s.location_id = l.location_id
                JOIN users u ON b.user_id = u.user_id
                WHERE 1=1
            `;

            const values = [];
            let paramCount = 1;

            // Filtri
            if (filters.user_id) {
                query += ` AND b.user_id = $${paramCount++}`;
                values.push(filters.user_id);
            }

            if (filters.manager_id) {
                query += ` AND l.manager_id = $${paramCount++}`;
                values.push(filters.manager_id);
            }

            if (filters.status) {
                query += ` AND p.status = $${paramCount++}`;
                values.push(filters.status);
            }

            if (filters.payment_method) {
                query += ` AND p.payment_method = $${paramCount++}`;
                values.push(filters.payment_method);
            }

            if (filters.date_from) {
                query += ` AND p.payment_date >= $${paramCount++}`;
                values.push(filters.date_from);
            }

            if (filters.date_to) {
                query += ` AND p.payment_date <= $${paramCount++}`;
                values.push(filters.date_to);
            }

            if (filters.location_id) {
                query += ` AND l.location_id = $${paramCount++}`;
                values.push(filters.location_id);
            }

            // Ordinamento
            query += ` ORDER BY p.payment_date DESC`;

            // Limit
            if (filters.limit) {
                query += ` LIMIT $${paramCount++}`;
                values.push(filters.limit);
            }

            const result = await pool.query(query, values);
            return result.rows.map(row => new Payment(row));
        } catch (error) {
            throw AppError.internal('Errore durante la ricerca dei pagamenti', error);
        }
    }

    /**
     * Aggiorna un pagamento
     * @param {number} paymentId - ID del pagamento
     * @param {Object} updateData - Dati da aggiornare
     * @returns {Promise<Payment>} - Pagamento aggiornato
     */
    static async update(paymentId, updateData) {
        // Verifica che il pagamento esista
        const existing = await this.findById(paymentId);
        if (!existing) {
            throw AppError.notFound('Pagamento non trovato');
        }

        // Campi aggiornabili
        const allowedFields = ['status', 'transaction_id'];
        
        const fieldsToUpdate = [];
        const values = [];
        let paramCount = 1;

        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                fieldsToUpdate.push(`${field} = $${paramCount++}`);
                values.push(updateData[field]);
            }
        });

        if (fieldsToUpdate.length === 0) {
            throw AppError.badRequest('Nessun campo valido da aggiornare');
        }

        const { pool } = db;

        try {
            const query = `
                UPDATE payments 
                SET ${fieldsToUpdate.join(', ')}
                WHERE payment_id = $${paramCount}
                RETURNING *
            `;
            values.push(paymentId);

            const result = await pool.query(query, values);
            return new Payment(result.rows[0]);
        } catch (error) {
            throw AppError.internal('Errore durante l\'aggiornamento del pagamento', error);
        }
    }

    /**
     * Elimina un pagamento
     * @param {number} paymentId - ID del pagamento
     * @returns {Promise<boolean>} - True se eliminato
     */
    static async delete(paymentId) {
        const { pool } = db;

        try {
            const result = await pool.query(
                'DELETE FROM payments WHERE payment_id = $1',
                [paymentId]
            );
            return result.rowCount > 0;
        } catch (error) {
            throw AppError.internal('Errore durante l\'eliminazione del pagamento', error);
        }
    }

    /**
     * Validazione dati pagamento
     * @param {Object} paymentData - Dati da validare
     */
    static validatePaymentData(paymentData) {
        const { booking_id, amount, payment_method } = paymentData;

        if (!booking_id || !amount || !payment_method) {
            throw AppError.badRequest('booking_id, amount e payment_method sono obbligatori');
        }

        if (isNaN(amount) || amount <= 0) {
            throw AppError.badRequest('L\'importo deve essere un numero positivo');
        }

        const validPaymentMethods = ['credit_card', 'paypal', 'bank_transfer', 'cash'];
        if (!validPaymentMethods.includes(payment_method)) {
            throw AppError.badRequest(`Metodo di pagamento non valido. Valori ammessi: ${validPaymentMethods.join(', ')}`);
        }

        const validStatuses = ['completed', 'failed', 'refunded'];
        if (paymentData.status && !validStatuses.includes(paymentData.status)) {
            throw AppError.badRequest(`Stato non valido. Valori ammessi: ${validStatuses.join(', ')}`);
        }
    }

    /**
     * Converte in JSON per le risposte API
     * @returns {Object} - Oggetto JSON
     */
    toJSON() {
        return {
            payment_id: this.payment_id,
            booking_id: this.booking_id,
            amount: parseFloat(this.amount),
            payment_date: this.payment_date,
            payment_method: this.payment_method,
            status: this.status,
            transaction_id: this.transaction_id,
            booking: this.booking,
            space: this.space,
            user: this.user
        };
    }
}

module.exports = Payment;
