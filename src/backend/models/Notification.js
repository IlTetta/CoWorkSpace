// src/backend/models/Notification.js
const db = require('../config/db');
const AppError = require('../utils/AppError');

/**
 * Model per la gestione delle notifiche nel database PostgreSQL
 */
class Notification {
    constructor(data) {
        this.notification_id = data.notification_id;
        this.user_id = data.user_id;
        this.type = data.type;
        this.channel = data.channel;
        this.recipient = data.recipient;
        this.subject = data.subject;
        this.content = data.content;
        this.template_name = data.template_name;
        this.template_data = data.template_data;
        this.status = data.status;
        this.metadata = data.metadata;
        this.booking_id = data.booking_id;
        this.payment_id = data.payment_id;
        this.sent_at = data.sent_at;
        this.delivered_at = data.delivered_at;
        this.read_at = data.read_at;
        this.error_message = data.error_message;
        this.retry_count = data.retry_count;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    /**
     * Crea una nuova notifica nel database
     * @param {Object} notificationData - Dati della notifica
     * @returns {Promise<Notification>} - Istanza notifica creata
     */
    static async create(notificationData) {
        // Validazione dati
        this.validateNotificationData(notificationData);

        const {
            user_id,
            type,
            channel,
            recipient,
            subject,
            content,
            template_name,
            template_data,
            status = 'pending',
            metadata,
            booking_id,
            payment_id
        } = notificationData;

        try {
            const query = `
                INSERT INTO notifications (
                    user_id, type, channel, recipient, subject, content,
                    template_name, template_data, status, metadata,
                    booking_id, payment_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *
            `;

            const values = [
                user_id, type, channel, recipient, subject, content,
                template_name, JSON.stringify(template_data), status, JSON.stringify(metadata),
                booking_id, payment_id
            ];

            const result = await db.query(query, values);
            const notification = new Notification(result.rows[0]);

            console.log(`[NOTIFICATION CREATED] ${type.toUpperCase()} - ${channel} - ${recipient}`);
            return notification;

        } catch (error) {
            console.error('Errore creazione notifica:', error);
            throw AppError.internalError('Errore nella creazione della notifica');
        }
    }

    /**
     * Trova notifica per ID
     * @param {number} notificationId - ID della notifica
     * @returns {Promise<Notification|null>} - Istanza notifica o null
     */
    static async findById(notificationId) {
        try {
            const query = 'SELECT * FROM notifications WHERE notification_id = $1';
            const result = await db.query(query, [notificationId]);

            if (result.rows.length === 0) {
                return null;
            }

            return new Notification(result.rows[0]);
        } catch (error) {
            console.error('Errore ricerca notifica per ID:', error);
            throw AppError.internalError('Errore nella ricerca della notifica');
        }
    }

    /**
     * Trova notifiche per utente
     * @param {number} userId - ID dell'utente
     * @param {Object} filters - Filtri di ricerca
     * @returns {Promise<Notification[]>} - Array di notifiche
     */
    static async findByUserId(userId, filters = {}) {
        try {
            let query = 'SELECT * FROM notifications WHERE user_id = $1';
            const values = [userId];
            let paramCount = 1;

            // Applicazione filtri
            if (filters.type) {
                paramCount++;
                query += ` AND type = $${paramCount}`;
                values.push(filters.type);
            }

            if (filters.channel) {
                paramCount++;
                query += ` AND channel = $${paramCount}`;
                values.push(filters.channel);
            }

            if (filters.status) {
                paramCount++;
                query += ` AND status = $${paramCount}`;
                values.push(filters.status);
            }

            if (filters.booking_id) {
                paramCount++;
                query += ` AND booking_id = $${paramCount}`;
                values.push(filters.booking_id);
            }

            if (filters.payment_id) {
                paramCount++;
                query += ` AND payment_id = $${paramCount}`;
                values.push(filters.payment_id);
            }

            // Ordinamento
            query += ' ORDER BY created_at DESC';

            // Limite risultati
            if (filters.limit) {
                paramCount++;
                query += ` LIMIT $${paramCount}`;
                values.push(filters.limit);
            }

            const result = await db.query(query, values);
            return result.rows.map(row => new Notification(row));

        } catch (error) {
            console.error('Errore ricerca notifiche per utente:', error);
            throw AppError.internalError('Errore nella ricerca delle notifiche');
        }
    }

    /**
     * Aggiorna stato notifica
     * @param {number} notificationId - ID della notifica
     * @param {string} status - Nuovo stato
     * @param {Object} metadata - Metadati aggiuntivi
     * @returns {Promise<Notification>} - Notifica aggiornata
     */
    static async updateStatus(notificationId, status, metadata = {}) {
        try {
            let setSentAt = '';
            let setDeliveredAt = '';
            let setReadAt = '';

            // Aggiorna timestamp in base al nuovo status
            if (status === 'sent' && !setSentAt) {
                setSentAt = ', sent_at = CURRENT_TIMESTAMP';
            }
            if (status === 'delivered' && !setDeliveredAt) {
                setDeliveredAt = ', delivered_at = CURRENT_TIMESTAMP';
            }
            if (status === 'read' && !setReadAt) {
                setReadAt = ', read_at = CURRENT_TIMESTAMP';
            }

            const query = `
                UPDATE notifications 
                SET status = $1, metadata = $2, error_message = $3${setSentAt}${setDeliveredAt}${setReadAt}
                WHERE notification_id = $4 
                RETURNING *
            `;

            const values = [
                status,
                JSON.stringify(metadata),
                metadata.error || null,
                notificationId
            ];

            const result = await db.query(query, values);

            if (result.rows.length === 0) {
                throw AppError.notFound('Notifica non trovata');
            }

            console.log(`[NOTIFICATION UPDATE] ID: ${notificationId}, Status: ${status} , Error: ${metadata.error || 'None'}`);
            return new Notification(result.rows[0]);

        } catch (error) {
            console.error('Errore aggiornamento stato notifica:', error);
            throw AppError.internalError('Errore nell\'aggiornamento della notifica');
        }
    }

    /**
     * Segna notifica come letta
     * @param {number} notificationId - ID della notifica
     * @param {number} userId - ID dell'utente (per sicurezza)
     * @returns {Promise<Notification>} - Notifica aggiornata
     */
    static async markAsRead(notificationId, userId) {
        try {
            const query = `
                UPDATE notifications 
                SET status = 'read', read_at = CURRENT_TIMESTAMP
                WHERE notification_id = $1 AND user_id = $2 
                RETURNING *
            `;

            const result = await db.query(query, [notificationId, userId]);

            if (result.rows.length === 0) {
                throw AppError.notFound('Notifica non trovata o non autorizzata');
            }

            return new Notification(result.rows[0]);

        } catch (error) {
            console.error('Errore marcatura notifica come letta:', error);
            throw AppError.internalError('Errore nella marcatura della notifica');
        }
    }

    /**
     * Elimina notifiche vecchie (cleanup)
     * @param {number} daysOld - Giorni di anzianità
     * @returns {Promise<number>} - Numero di notifiche eliminate
     */
    static async deleteOld(daysOld = 90) {
        try {
            const query = `
                DELETE FROM notifications 
                WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
            `;

            const result = await db.query(query);
            console.log(`[NOTIFICATION CLEANUP] Eliminate ${result.rowCount} notifiche`);
            return result.rowCount;

        } catch (error) {
            console.error('Errore cleanup notifiche:', error);
            throw AppError.internalError('Errore nella pulizia delle notifiche');
        }
    }

    /**
     * Statistiche notifiche per utente
     * @param {number} userId - ID dell'utente
     * @returns {Promise<Object>} - Statistiche
     */
    static async getStats(userId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
                    COUNT(CASE WHEN status = 'read' THEN 1 END) as read,
                    COUNT(CASE WHEN type = 'email' THEN 1 END) as emails,
                    COUNT(CASE WHEN type = 'push' THEN 1 END) as pushes
                FROM notifications 
                WHERE user_id = $1
            `;

            const result = await db.query(query, [userId]);
            return result.rows[0];

        } catch (error) {
            console.error('Errore statistiche notifiche:', error);
            throw AppError.internalError('Errore nel calcolo delle statistiche');
        }
    }

    /**
     * Validazione dati notifica
     * @param {Object} notificationData - Dati da validare
     */
    static validateNotificationData(notificationData) {
        const { user_id, type, channel, recipient } = notificationData;

        if (!user_id || !type || !channel || !recipient) {
            throw AppError.badRequest('user_id, type, channel e recipient sono obbligatori');
        }

        const validTypes = ['email', 'push', 'sms'];
        if (!validTypes.includes(type)) {
            throw AppError.badRequest(`Tipo notifica non valido. Valori ammessi: ${validTypes.join(', ')}`);
        }

        const validChannels = [
            'booking_confirmation',
            'booking_cancellation', 
            'payment_success',
            'payment_failed',
            'payment_refund',
            'booking_reminder',
            'user_registration',
            'password_reset'
        ];
        if (!validChannels.includes(channel)) {
            throw AppError.badRequest(`Channel non valido. Valori ammessi: ${validChannels.join(', ')}`);
        }

        // Validazione email
        if (type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(recipient)) {
                throw AppError.badRequest('Formato email non valido');
            }
        }
    }

    /**
     * Converte l'istanza in oggetto JSON
     * @returns {Object} - Oggetto JSON
     */
    toJSON() {
        return {
            notification_id: this.notification_id,
            user_id: this.user_id,
            type: this.type,
            channel: this.channel,
            recipient: this.recipient,
            subject: this.subject,
            content: this.content,
            template_name: this.template_name,
            template_data: this.template_data,
            status: this.status,
            metadata: this.metadata,
            booking_id: this.booking_id,
            payment_id: this.payment_id,
            sent_at: this.sent_at,
            delivered_at: this.delivered_at,
            read_at: this.read_at,
            error_message: this.error_message,
            retry_count: this.retry_count,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = Notification;
