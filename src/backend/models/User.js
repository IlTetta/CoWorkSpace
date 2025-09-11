const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const AppError = require('../utils/AppError');

class User {
    constructor(userData) {
        this.user_id = userData.user_id;
        this.name = userData.name;
        this.surname = userData.surname;
        this.email = userData.email;
        this.password_hash = userData.password_hash;
        this.role = userData.role;
        this.created_at = userData.created_at;
        this.is_password_reset_required = userData.is_password_reset_required || false;
        this.temp_password_hash = userData.temp_password_hash;
        this.temp_password_expires_at = userData.temp_password_expires_at;
        this.fcm_token = userData.fcm_token;
        this.manager_request_pending = userData.manager_request_pending || false;
        this.manager_request_date = userData.manager_request_date;
    }

    /**
     * Crea un nuovo utente nel database
     * @param {Object} userData - Dati dell'utente
     * @returns {Promise<User>} - Nuovo utente creato
     */
    static async create(userData) {
        const { name, surname, email, password, requestManagerRole } = userData;

        // Validazione business logic
        this.validateUserData({ name, surname, email, password });

        // Verifica se email già esiste
        const existingUser = await this.findByEmail(email);
        if (existingUser) {
            throw AppError.conflict('Email già registrata');
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const password_hash = await bcrypt.hash(password, salt);

        // Determina i valori per la richiesta manager
        const manager_request_pending = requestManagerRole || false;
        const manager_request_date = requestManagerRole ? new Date() : null;

        try {
            const result = await pool.query(
                `INSERT INTO users (name, surname, email, password_hash, role, manager_request_pending, manager_request_date)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) 
                 RETURNING user_id, name, surname, email, role, created_at, manager_request_pending, manager_request_date`,
                [name, surname, email, password_hash, 'user', manager_request_pending, manager_request_date]
            );

            return new User(result.rows[0]);
        } catch (error) {
            if (error.code === '23505') {
                throw AppError.conflict('Email già registrata');
            }
            throw AppError.internal('Errore durante la creazione dell\'utente', error);
        }
    }

    /**
     * Trova utente per email
     * @param {string} email - Email dell'utente
     * @returns {Promise<User|null>} - Utente trovato o null
     */
    static async findByEmail(email) {
        try {
            const result = await pool.query(
                'SELECT * FROM users WHERE email = $1',
                [email]
            );

            return result.rows.length > 0 ? new User(result.rows[0]) : null;
        } catch (error) {
            throw AppError.internal('Errore durante la ricerca utente per email', error);
        }
    }

    /**
     * Trova utente per ID
     * @param {number} id - ID dell'utente
     * @returns {Promise<User|null>} - Utente trovato o null
     */
    static async findById(id) {
        try {
            const result = await pool.query(
                `SELECT user_id, name, surname, email, role, created_at, 
                        is_password_reset_required, temp_password_hash, temp_password_expires_at,
                        manager_request_pending, manager_request_date 
                 FROM users WHERE user_id = $1`,
                [id]
            );

            return result.rows.length > 0 ? new User(result.rows[0]) : null;
        } catch (error) {
            throw AppError.internal('Errore durante la ricerca utente per ID', error);
        }
    }

    /**
     * Cerca utenti per email (ricerca parziale)
     * @param {string} emailPattern - Pattern email da cercare
     * @param {number} limit - Limite risultati (default 10)
     * @returns {Promise<Array>} - Array di utenti trovati (senza dati sensibili)
     */
    static async searchByEmail(emailPattern, limit = 10) {
        try {
            const result = await pool.query(
                `SELECT user_id, name, surname, email, role, created_at, manager_request_pending, manager_request_date
                 FROM users 
                 WHERE LOWER(email) LIKE LOWER($1)
                 ORDER BY email
                 LIMIT $2`,
                [`%${emailPattern}%`, limit]
            );

            return result.rows.map(row => ({
                id: row.user_id,
                name: row.name,
                surname: row.surname,
                email: row.email,
                role: row.role,
                created_at: row.created_at,
                manager_request_pending: row.manager_request_pending,
                manager_request_date: row.manager_request_date
            }));
        } catch (error) {
            throw AppError.internal('Errore durante la ricerca utenti per email', error);
        }
    }

    static async updateFcmToken(user) {
        try {
            const result = await pool.query(
                `UPDATE users SET fcm_token = $1 WHERE user_id = $2 RETURNING user_id, fcm_token`,
                [user.fcm_token, user.user_id]
            );

            return result.rows[0];
        } catch (error) {
            throw AppError.internal('Errore durante l\'aggiornamento del token FCM', error);
        }
    }

    /**
     * Verifica password dell'utente
     * @param {string} password - Password in chiaro
     * @returns {Promise<boolean>} - True se password corretta
     */
    async verifyPassword(password) {
        try {
            return await bcrypt.compare(password, this.password_hash);
        } catch (error) {
            throw AppError.internal('Errore durante la verifica password', error);
        }
    }

    /**
     * Aggiorna profilo utente
     * @param {Object} updateData - Dati da aggiornare
     * @returns {Promise<User>} - Utente aggiornato
     */
    async updateProfile(updateData) {
        const allowedFields = ['name', 'surname', 'email'];
        const updateFields = [];
        const queryParams = [this.user_id];
        let queryIndex = 2;

        // Costruisce query dinamicamente
        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key) && value !== undefined) {
                // Validazione email se presente
                if (key === 'email') {
                    this.validateEmail(value);
                    
                    // Verifica che email non sia già usata da altro utente
                    const existingUser = await User.findByEmail(value);
                    if (existingUser && existingUser.user_id !== this.user_id) {
                        throw AppError.conflict('Email già utilizzata da un altro utente');
                    }
                }

                updateFields.push(`${key} = $${queryIndex++}`);
                queryParams.push(value);
            }
        }

        if (updateFields.length === 0) {
            throw AppError.badRequest('Nessun campo valido fornito per l\'aggiornamento');
        }

        try {
            const query = `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = $1 RETURNING user_id, name, surname, email, role, created_at`;
            const result = await pool.query(query, queryParams);

            // Aggiorna istanza corrente
            Object.assign(this, result.rows[0]);
            return this;
        } catch (error) {
            if (error.code === '23505') {
                throw AppError.conflict('Email già registrata');
            }
            throw AppError.internal('Errore durante l\'aggiornamento profilo', error);
        }
    }

    /**
     * Cambia password utente
     * @param {string} currentPassword - Password attuale
     * @param {string} newPassword - Nuova password
     * @returns {Promise<boolean>} - True se aggiornamento riuscito
     */
    async changePassword(currentPassword, newPassword) {
        // Verifica password attuale
        const isCurrentPasswordValid = await this.verifyPassword(currentPassword);
        if (!isCurrentPasswordValid) {
            throw AppError.badRequest('Password attuale non corretta');
        }

        // Validazione nuova password
        this.validatePassword(newPassword);

        // Hash nuova password
        const salt = await bcrypt.genSalt(12);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        try {
            await pool.query(
                'UPDATE users SET password_hash = $1 WHERE user_id = $2',
                [newPasswordHash, this.user_id]
            );

            this.password_hash = newPasswordHash;
            return true;
        } catch (error) {
            throw AppError.internal('Errore durante il cambio password', error);
        }
    }

    /**
     * Cambia password durante il reset (con password temporanea)
     * @param {string} currentPassword - Password attuale o temporanea
     * @param {string} newPassword - Nuova password
     * @returns {Promise<boolean>} - True se aggiornamento riuscito
     */
    async changePasswordOnReset(currentPassword, newPassword) {
        // Se l'utente deve resettare la password, verifica prima la password temporanea
        if (this.is_password_reset_required && this.temp_password_hash) {
            const isTempPasswordValid = await bcrypt.compare(currentPassword, this.temp_password_hash);
            
            // Verifica se la password temporanea è scaduta
            if (this.temp_password_expires_at && new Date() > new Date(this.temp_password_expires_at)) {
                throw AppError.badRequest('Password temporanea scaduta. Richiedi un nuovo reset password');
            }
            
            if (!isTempPasswordValid) {
                // Prova anche con la password normale per compatibilità
                const isCurrentPasswordValid = await bcrypt.compare(currentPassword, this.password_hash);
                if (!isCurrentPasswordValid) {
                    throw AppError.badRequest('Password attuale non corretta');
                }
            }
        } else {
            // Verifica password attuale normale
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, this.password_hash);
            if (!isCurrentPasswordValid) {
                throw AppError.badRequest('Password attuale non corretta');
            }
        }

        // Validazione nuova password
        User.validatePassword(newPassword);

        // Hash nuova password
        const salt = await bcrypt.genSalt(12);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        try {
            await pool.query(
                `UPDATE users SET 
                    password_hash = $1, 
                    is_password_reset_required = FALSE, 
                    temp_password_hash = NULL, 
                    temp_password_expires_at = NULL 
                 WHERE user_id = $2`,
                [newPasswordHash, this.user_id]
            );

            this.password_hash = newPasswordHash;
            this.is_password_reset_required = false;
            this.temp_password_hash = null;
            this.temp_password_expires_at = null;
            return true;
        } catch (error) {
            throw AppError.internal('Errore durante il cambio password', error);
        }
    }

    /**
     * Genera password temporanea per reset
     * @returns {Promise<string>} - Password temporanea in chiaro
     */
    async generateTemporaryPassword() {
        // Genera password temporanea di 12 caratteri
        const tempPassword = crypto.randomBytes(6).toString('hex') + 'Aa1!';
        
        // Hash della password temporanea
        const salt = await bcrypt.genSalt(12);
        const tempPasswordHash = await bcrypt.hash(tempPassword, salt);
        
        // Scadenza password temporanea (24 ore)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        try {
            await pool.query(
                `UPDATE users SET 
                    temp_password_hash = $1, 
                    temp_password_expires_at = $2, 
                    is_password_reset_required = TRUE 
                 WHERE user_id = $3`,
                [tempPasswordHash, expiresAt, this.user_id]
            );

            this.temp_password_hash = tempPasswordHash;
            this.temp_password_expires_at = expiresAt;
            this.is_password_reset_required = true;

            return tempPassword;
        } catch (error) {
            throw AppError.internal('Errore durante la generazione password temporanea', error);
        }
    }

    /**
     * Imposta flag per richiedere reset password (per cambio da profilo)
     * @returns {Promise<boolean>} - True se aggiornamento riuscito
     */
    async requirePasswordReset() {
        try {
            await pool.query(
                'UPDATE users SET is_password_reset_required = TRUE WHERE user_id = $1',
                [this.user_id]
            );

            this.is_password_reset_required = true;
            return true;
        } catch (error) {
            throw AppError.internal('Errore durante l\'impostazione reset password', error);
        }
    }

    /**
     * Verifica password dell'utente (normale o temporanea per login)
     * Blocca il login se l'utente ha una richiesta manager pending
     * @param {string} password - Password in chiaro
     * @returns {Promise<Object>} - Oggetto con validità e necessità di reset
     */
    async verifyPasswordForLogin(password) {
        try {
            // Blocca login se c'è una richiesta manager pending
            if (this.manager_request_pending) {
                return { 
                    isValid: false, 
                    requiresReset: false, 
                    managerRequestPending: true,
                    message: 'Il tuo account è in attesa di approvazione per diventare manager. Non puoi effettuare il login fino all\'approvazione.'
                };
            }

            // Prima verifica password normale
            const isNormalPasswordValid = await bcrypt.compare(password, this.password_hash);
            
            // Se la password normale è valida e non è richiesto reset, ritorna true
            if (isNormalPasswordValid && !this.is_password_reset_required) {
                return { isValid: true, requiresReset: false };
            }
            
            // Se è richiesto reset e c'è una password temporanea
            if (this.is_password_reset_required && this.temp_password_hash) {
                // Verifica se la password temporanea è scaduta
                if (this.temp_password_expires_at && new Date() > new Date(this.temp_password_expires_at)) {
                    return { isValid: false, requiresReset: true, expired: true };
                }
                
                // Verifica password temporanea
                const isTempPasswordValid = await bcrypt.compare(password, this.temp_password_hash);
                if (isTempPasswordValid) {
                    return { isValid: true, requiresReset: true };
                }
            }
            
            // Se è richiesto reset ma non c'è password temporanea, usa password normale
            if (this.is_password_reset_required && !this.temp_password_hash && isNormalPasswordValid) {
                return { isValid: true, requiresReset: true };
            }
            
            return { isValid: isNormalPasswordValid, requiresReset: this.is_password_reset_required };
        } catch (error) {
            throw AppError.internal('Errore durante la verifica password', error);
        }
    }

    /**
     * Approva richiesta manager per un utente
     * @param {number} userId - ID dell'utente da promuovere
     * @returns {Promise<User>} - Utente aggiornato
     */
    static async approveManagerRequest(userId) {
        try {
            const result = await pool.query(
                `UPDATE users 
                 SET role = 'manager', manager_request_pending = FALSE, manager_request_date = NULL
                 WHERE user_id = $1 AND manager_request_pending = TRUE
                 RETURNING user_id, name, surname, email, role, created_at, manager_request_pending, manager_request_date`,
                [userId]
            );

            if (result.rows.length === 0) {
                throw AppError.notFound('Utente non trovato o non ha una richiesta manager pending');
            }

            return new User(result.rows[0]);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw AppError.internal('Errore durante l\'approvazione della richiesta manager', error);
        }
    }

    /**
     * Rifiuta richiesta manager per un utente
     * @param {number} userId - ID dell'utente
     * @returns {Promise<User>} - Utente aggiornato
     */
    static async rejectManagerRequest(userId) {
        try {
            const result = await pool.query(
                `UPDATE users 
                 SET manager_request_pending = FALSE, manager_request_date = NULL
                 WHERE user_id = $1 AND manager_request_pending = TRUE
                 RETURNING user_id, name, surname, email, role, created_at, manager_request_pending, manager_request_date`,
                [userId]
            );

            if (result.rows.length === 0) {
                throw AppError.notFound('Utente non trovato o non ha una richiesta manager pending');
            }

            return new User(result.rows[0]);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw AppError.internal('Errore durante il rifiuto della richiesta manager', error);
        }
    }

    /**
     * Ottieni tutti gli utenti con richiesta manager pending
     * @returns {Promise<Array>} - Array di utenti con richiesta pending
     */
    static async getPendingManagerRequests() {
        try {
            const result = await pool.query(
                `SELECT user_id, name, surname, email, role, created_at, manager_request_pending, manager_request_date
                 FROM users 
                 WHERE manager_request_pending = TRUE
                 ORDER BY manager_request_date ASC`
            );

            return result.rows.map(row => new User(row));
        } catch (error) {
            throw AppError.internal('Errore durante il recupero delle richieste manager pending', error);
        }
    }

    /**
     * Ottieni dashboard completa per utente
     * @param {number} userId - ID dell'utente
     * @returns {Promise<Object>} - Dati dashboard dell'utente
     */
    static async getDashboard(userId) {
        try {
            // 1. Informazioni personali
            const user = await this.findById(userId);
            if (!user) {
                throw AppError.notFound('Utente non trovato');
            }

            // 2. Query per prenotazioni con dettagli completi
            const bookingsQuery = `
                SELECT 
                    b.booking_id,
                    b.start_date,
                    b.end_date,
                    b.total_days,
                    b.total_price,
                    b.status,
                    b.created_at,
                    s.space_name,
                    s.capacity,
                    s.price_per_hour,
                    s.price_per_day,
                    st.type_name as space_type,
                    l.location_name,
                    l.address,
                    l.city,
                    p.payment_id,
                    p.amount as payment_amount,
                    p.payment_method,
                    p.status as payment_status,
                    p.payment_date,
                    p.transaction_id
                FROM bookings b
                JOIN spaces s ON b.space_id = s.space_id
                JOIN space_types st ON s.space_type_id = st.space_type_id
                JOIN locations l ON s.location_id = l.location_id
                LEFT JOIN payments p ON b.booking_id = p.booking_id
                WHERE b.user_id = $1
                ORDER BY b.created_at DESC
            `;

            const bookingsResult = await pool.query(bookingsQuery, [userId]);

            // 3. Statistiche generali
            const statsQuery = `
                SELECT 
                    COUNT(DISTINCT b.booking_id) as total_bookings,
                    COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.booking_id END) as completed_bookings,
                    COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.booking_id END) as confirmed_bookings,
                    COUNT(DISTINCT CASE WHEN b.status = 'cancelled' THEN b.booking_id END) as cancelled_bookings,
                    COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as total_spent,
                    COALESCE(SUM(b.total_days), 0) as total_days_booked,
                    COUNT(DISTINCT s.location_id) as locations_visited,
                    COUNT(DISTINCT s.space_type_id) as space_types_used
                FROM bookings b
                LEFT JOIN payments p ON b.booking_id = p.booking_id
                LEFT JOIN spaces s ON b.space_id = s.space_id
                WHERE b.user_id = $1
            `;

            const statsResult = await pool.query(statsQuery, [userId]);
            const stats = statsResult.rows[0] || {};

            // 4. Prenotazioni future (confirmed)
            const upcomingBookingsQuery = `
                SELECT 
                    b.booking_id,
                    b.start_date,
                    b.end_date,
                    s.space_name,
                    st.type_name as space_type,
                    l.location_name,
                    l.address
                FROM bookings b
                JOIN spaces s ON b.space_id = s.space_id
                JOIN space_types st ON s.space_type_id = st.space_type_id
                JOIN locations l ON s.location_id = l.location_id
                WHERE b.user_id = $1 
                AND b.status = 'confirmed'
                AND b.start_date > CURRENT_DATE
                ORDER BY b.start_date ASC
                LIMIT 5
            `;

            const upcomingBookings = await pool.query(upcomingBookingsQuery, [userId]);

            // 5. Prenotazioni recenti (ultime 5)
            const recentBookingsQuery = `
                SELECT 
                    b.booking_id,
                    b.start_date,
                    b.end_date,
                    b.status,
                    s.space_name,
                    st.type_name as space_type,
                    l.location_name,
                    p.status as payment_status
                FROM bookings b
                JOIN spaces s ON b.space_id = s.space_id
                JOIN space_types st ON s.space_type_id = st.space_type_id
                JOIN locations l ON s.location_id = l.location_id
                LEFT JOIN payments p ON b.booking_id = p.booking_id
                WHERE b.user_id = $1
                ORDER BY b.created_at DESC
                LIMIT 5
            `;

            const recentBookings = await pool.query(recentBookingsQuery, [userId]);

            // 6. Top location preferite
            const topLocationsQuery = `
                SELECT 
                    l.location_name,
                    l.city,
                    COUNT(*) as booking_count
                FROM bookings b
                JOIN spaces s ON b.space_id = s.space_id
                JOIN locations l ON s.location_id = l.location_id
                WHERE b.user_id = $1
                GROUP BY l.location_id, l.location_name, l.city
                ORDER BY booking_count DESC
                LIMIT 3
            `;

            const topLocations = await pool.query(topLocationsQuery, [userId]);

            // 7. Top space types preferiti
            const topSpaceTypesQuery = `
                SELECT 
                    st.type_name,
                    COUNT(*) as booking_count
                FROM bookings b
                JOIN spaces s ON b.space_id = s.space_id
                JOIN space_types st ON s.space_type_id = st.space_type_id
                WHERE b.user_id = $1
                GROUP BY st.space_type_id, st.type_name
                ORDER BY booking_count DESC
                LIMIT 3
            `;

            const topSpaceTypes = await pool.query(topSpaceTypesQuery, [userId]);

            return {
                user: {
                    user_id: user.user_id,
                    name: user.name,
                    surname: user.surname,
                    email: user.email,
                    role: user.role,
                    created_at: user.created_at
                },
                statistics: {
                    total_bookings: parseInt(stats.total_bookings || 0),
                    completed_bookings: parseInt(stats.completed_bookings || 0),
                    confirmed_bookings: parseInt(stats.confirmed_bookings || 0),
                    cancelled_bookings: parseInt(stats.cancelled_bookings || 0),
                    total_spent: parseFloat(stats.total_spent || 0),
                    total_days_booked: parseFloat(stats.total_days_booked || 0),
                    locations_visited: parseInt(stats.locations_visited || 0),
                    space_types_used: parseInt(stats.space_types_used || 0)
                },
                bookings: {
                    all: bookingsResult.rows,
                    upcoming: upcomingBookings.rows,
                    recent: recentBookings.rows,
                    total: bookingsResult.rows.length
                },
                preferences: {
                    top_locations: topLocations.rows,
                    top_space_types: topSpaceTypes.rows
                }
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw AppError.internal('Errore durante il recupero dashboard utente', error);
        }
    }

    /**
     * Ottieni dashboard completa per manager
     * @param {number} managerId - ID del manager
     * @returns {Promise<Object>} - Dati dashboard del manager
     */
    static async getManagerDashboard(managerId) {
        try {
            // 1. Informazioni personali del manager
            const manager = await this.findById(managerId);
            if (!manager) {
                throw AppError.notFound('Manager non trovato');
            }

            if (manager.role !== 'manager' && manager.role !== 'admin') {
                throw AppError.forbidden('Accesso riservato ai manager');
            }

            // 2. Location gestite dal manager
            const locationsQuery = `
                SELECT 
                    l.location_id,
                    l.location_name,
                    l.address,
                    l.city,
                    l.description,
                    COUNT(DISTINCT s.space_id) as total_spaces,
                    COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.booking_id END) as active_bookings,
                    COUNT(DISTINCT b.user_id) as unique_customers
                FROM locations l
                LEFT JOIN spaces s ON l.location_id = s.location_id
                LEFT JOIN bookings b ON s.space_id = b.space_id AND b.start_date >= CURRENT_DATE
                WHERE l.manager_id = $1
                GROUP BY l.location_id, l.location_name, l.address, l.city, l.description
                ORDER BY l.location_name
            `;

            const locations = await pool.query(locationsQuery, [managerId]);

            // 3. Tutte le prenotazioni per le location gestite con dati utente
            const bookingsQuery = `
                SELECT 
                    b.booking_id,
                    b.start_date,
                    b.end_date,
                    b.total_days,
                    b.total_price,
                    b.status,
                    b.created_at,
                    u.user_id,
                    u.name as customer_name,
                    u.surname as customer_surname,
                    u.email as customer_email,
                    s.space_id,
                    s.space_name,
                    s.capacity,
                    st.type_name as space_type,
                    l.location_id,
                    l.location_name,
                    l.city,
                    p.payment_id,
                    p.amount as payment_amount,
                    p.payment_method,
                    p.status as payment_status,
                    p.payment_date,
                    p.transaction_id
                FROM bookings b
                JOIN users u ON b.user_id = u.user_id
                JOIN spaces s ON b.space_id = s.space_id
                JOIN space_types st ON s.space_type_id = st.space_type_id
                JOIN locations l ON s.location_id = l.location_id
                LEFT JOIN payments p ON b.booking_id = p.booking_id
                WHERE l.manager_id = $1
                ORDER BY b.created_at DESC
            `;

            const allBookings = await pool.query(bookingsQuery, [managerId]);

            // 4. Statistiche generali per le location gestite
            const statsQuery = `
                SELECT 
                    COUNT(DISTINCT b.booking_id) as total_bookings,
                    COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.booking_id END) as completed_bookings,
                    COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.booking_id END) as confirmed_bookings,
                    COUNT(DISTINCT CASE WHEN b.status = 'cancelled' THEN b.booking_id END) as cancelled_bookings,
                    COUNT(DISTINCT CASE WHEN b.status = 'pending' THEN b.booking_id END) as pending_bookings,
                    COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as total_revenue,
                    COALESCE(SUM(b.total_days), 0) as total_days_booked,
                    COUNT(DISTINCT b.user_id) as unique_customers,
                    COUNT(DISTINCT s.space_id) as spaces_used,
                    COUNT(DISTINCT l.location_id) as locations_managed
                FROM bookings b
                JOIN spaces s ON b.space_id = s.space_id
                JOIN locations l ON s.location_id = l.location_id
                LEFT JOIN payments p ON b.booking_id = p.booking_id
                WHERE l.manager_id = $1
            `;

            const statsResult = await pool.query(statsQuery, [managerId]);
            const stats = statsResult.rows[0] || {};

            // 5. Prenotazioni future (confirmed e pending)
            const upcomingBookingsQuery = `
                SELECT 
                    b.booking_id,
                    b.start_date,
                    b.end_date,
                    b.status,
                    u.name as customer_name,
                    u.surname as customer_surname,
                    u.email as customer_email,
                    s.space_name,
                    st.type_name as space_type,
                    l.location_name,
                    p.status as payment_status
                FROM bookings b
                JOIN users u ON b.user_id = u.user_id
                JOIN spaces s ON b.space_id = s.space_id
                JOIN space_types st ON s.space_type_id = st.space_type_id
                JOIN locations l ON s.location_id = l.location_id
                LEFT JOIN payments p ON b.booking_id = p.booking_id
                WHERE l.manager_id = $1 
                AND b.status IN ('confirmed', 'pending')
                AND b.start_date > CURRENT_DATE
                ORDER BY b.start_date ASC
                LIMIT 10
            `;

            const upcomingBookings = await pool.query(upcomingBookingsQuery, [managerId]);

            // 6. Prenotazioni recenti (ultime 10)
            const recentBookingsQuery = `
                SELECT 
                    b.booking_id,
                    b.start_date,
                    b.end_date,
                    b.status,
                    b.created_at,
                    u.name as customer_name,
                    u.surname as customer_surname,
                    u.email as customer_email,
                    s.space_name,
                    st.type_name as space_type,
                    l.location_name,
                    p.status as payment_status,
                    p.payment_method
                FROM bookings b
                JOIN users u ON b.user_id = u.user_id
                JOIN spaces s ON b.space_id = s.space_id
                JOIN space_types st ON s.space_type_id = st.space_type_id
                JOIN locations l ON s.location_id = l.location_id
                LEFT JOIN payments p ON b.booking_id = p.booking_id
                WHERE l.manager_id = $1
                ORDER BY b.created_at DESC
                LIMIT 10
            `;

            const recentBookings = await pool.query(recentBookingsQuery, [managerId]);

            // 7. Top customers (utenti con più prenotazioni)
            const topCustomersQuery = `
                SELECT 
                    u.user_id,
                    u.name,
                    u.surname,
                    u.email,
                    COUNT(b.booking_id) as total_bookings,
                    COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as total_spent,
                    MAX(b.created_at) as last_booking_date
                FROM bookings b
                JOIN users u ON b.user_id = u.user_id
                JOIN spaces s ON b.space_id = s.space_id
                JOIN locations l ON s.location_id = l.location_id
                LEFT JOIN payments p ON b.booking_id = p.booking_id
                WHERE l.manager_id = $1
                GROUP BY u.user_id, u.name, u.surname, u.email
                ORDER BY total_bookings DESC, total_spent DESC
                LIMIT 5
            `;

            const topCustomers = await pool.query(topCustomersQuery, [managerId]);

            // 8. Performance per location
            const locationPerformanceQuery = `
                SELECT 
                    l.location_id,
                    l.location_name,
                    l.city,
                    COUNT(b.booking_id) as total_bookings,
                    COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as revenue,
                    COUNT(DISTINCT b.user_id) as unique_customers,
                    AVG(b.total_days) as avg_booking_days
                FROM locations l
                LEFT JOIN spaces s ON l.location_id = s.location_id
                LEFT JOIN bookings b ON s.space_id = b.space_id
                LEFT JOIN payments p ON b.booking_id = p.booking_id
                WHERE l.manager_id = $1
                GROUP BY l.location_id, l.location_name, l.city
                ORDER BY revenue DESC, total_bookings DESC
            `;

            const locationPerformance = await pool.query(locationPerformanceQuery, [managerId]);

            // 9. Statistiche sui pagamenti
            const paymentsStatsQuery = `
                SELECT 
                    p.payment_method,
                    COUNT(*) as payment_count,
                    SUM(p.amount) as total_amount,
                    COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_count,
                    COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_count,
                    COUNT(CASE WHEN p.status = 'refunded' THEN 1 END) as refunded_count
                FROM payments p
                JOIN bookings b ON p.booking_id = b.booking_id
                JOIN spaces s ON b.space_id = s.space_id
                JOIN locations l ON s.location_id = l.location_id
                WHERE l.manager_id = $1
                GROUP BY p.payment_method
                ORDER BY total_amount DESC
            `;

            const paymentStats = await pool.query(paymentsStatsQuery, [managerId]);

            return {
                manager: {
                    user_id: manager.user_id,
                    name: manager.name,
                    surname: manager.surname,
                    email: manager.email,
                    role: manager.role,
                    created_at: manager.created_at
                },
                locations: locations.rows,
                statistics: {
                    total_bookings: parseInt(stats.total_bookings || 0),
                    completed_bookings: parseInt(stats.completed_bookings || 0),
                    confirmed_bookings: parseInt(stats.confirmed_bookings || 0),
                    cancelled_bookings: parseInt(stats.cancelled_bookings || 0),
                    pending_bookings: parseInt(stats.pending_bookings || 0),
                    total_revenue: parseFloat(stats.total_revenue || 0),
                    total_hours_booked: parseFloat(stats.total_hours_booked || 0),
                    unique_customers: parseInt(stats.unique_customers || 0),
                    spaces_used: parseInt(stats.spaces_used || 0),
                    locations_managed: parseInt(stats.locations_managed || 0)
                },
                bookings: {
                    all: allBookings.rows,
                    upcoming: upcomingBookings.rows,
                    recent: recentBookings.rows,
                    total: allBookings.rows.length
                },
                customers: {
                    top: topCustomers.rows,
                    total_unique: parseInt(stats.unique_customers || 0)
                },
                performance: {
                    by_location: locationPerformance.rows,
                    payment_methods: paymentStats.rows
                }
            };

        } catch (error) {
            if (error instanceof AppError) throw error;
            throw AppError.internal('Errore durante il recupero dashboard manager', error);
        }
    }

    /**
     * Validazione dati utente
     * @param {Object} userData - Dati da validare
     * @throws {AppError} - Se validazione fallisce
     */
    static validateUserData({ name, surname, email, password }) {
        const errors = [];

        if (!name || name.trim().length < 2) {
            errors.push('Nome deve essere di almeno 2 caratteri');
        }

        if (!surname || surname.trim().length < 2) {
            errors.push('Cognome deve essere di almeno 2 caratteri');
        }

        if (!email) {
            errors.push('Email è obbligatoria');
        } else {
            this.validateEmail(email);
        }

        if (!password) {
            errors.push('Password è obbligatoria');
        } else {
            this.validatePassword(password);
        }

        if (errors.length > 0) {
            throw AppError.badRequest('Dati non validi', { errors });
        }
    }

    /**
     * Validazione email
     * @param {string} email - Email da validare
     * @throws {AppError} - Se email non valida
     */
    static validateEmail(email) {
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        if (!emailRegex.test(email)) {
            throw AppError.badRequest('Formato email non valido');
        }
    }

    /**
     * Validazione password
     * @param {string} password - Password da validare
     * @throws {AppError} - Se password non valida
     */
    static validatePassword(password) {
        if (password.length < 8) {
            throw AppError.badRequest('Password deve essere di almeno 8 caratteri');
        }

        // Password policy: almeno una maiuscola, una minuscola, un numero
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);

        if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
            throw AppError.badRequest('Password deve contenere almeno una maiuscola, una minuscola e un numero');
        }
    }

    /**
     * Serializza utente per response (rimuove dati sensibili)
     * @returns {Object} - Dati utente sicuri
     */
    toJSON() {
        return {
            id: this.user_id,
            name: this.name,
            surname: this.surname,
            email: this.email,
            role: this.role,
            created_at: this.created_at,
            is_password_reset_required: this.is_password_reset_required,
            manager_request_pending: this.manager_request_pending,
            manager_request_date: this.manager_request_date
        };
    }

    /**
     * Verifica se utente ha ruolo specifico
     * @param {string} role - Ruolo da verificare
     * @returns {boolean} - True se utente ha il ruolo
     */
    hasRole(role) {
        return this.role === role;
    }

    /**
     * Verifica se utente ha uno dei ruoli specificati
     * @param {string[]} roles - Ruoli da verificare
     * @returns {boolean} - True se utente ha almeno uno dei ruoli
     */
    hasAnyRole(roles) {
        return roles.includes(this.role);
    }
}

module.exports = User;
