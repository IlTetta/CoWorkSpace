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
    }

    /**
     * Crea un nuovo utente nel database
     * @param {Object} userData - Dati dell'utente
     * @returns {Promise<User>} - Nuovo utente creato
     */
    static async create(userData) {
        const { name, surname, email, password, role } = userData;

        // Validazione business logic
        this.validateUserData({ name, surname, email, password, role });

        // Verifica se email già esiste
        const existingUser = await this.findByEmail(email);
        if (existingUser) {
            throw AppError.conflict('Email già registrata');
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const password_hash = await bcrypt.hash(password, salt);

        try {
            const result = await pool.query(
                `INSERT INTO users (name, surname, email, password_hash, role)
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING user_id, name, surname, email, role, created_at`,
                [name, surname, email, password_hash, role]
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
                        is_password_reset_required, temp_password_hash, temp_password_expires_at 
                 FROM users WHERE user_id = $1`,
                [id]
            );

            return result.rows.length > 0 ? new User(result.rows[0]) : null;
        } catch (error) {
            throw AppError.internal('Errore durante la ricerca utente per ID', error);
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
     * @param {string} password - Password in chiaro
     * @returns {Promise<Object>} - Oggetto con validità e necessità di reset
     */
    async verifyPasswordForLogin(password) {
        try {
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
     * Validazione dati utente
     * @param {Object} userData - Dati da validare
     * @throws {AppError} - Se validazione fallisce
     */
    static validateUserData({ name, surname, email, password, role }) {
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

        if (!role || !['user', 'manager', 'admin'].includes(role)) {
            errors.push('Ruolo deve essere: user, manager o admin');
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
            is_password_reset_required: this.is_password_reset_required
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
