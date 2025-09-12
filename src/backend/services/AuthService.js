const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

class AuthService {
    /**
     * Registra un nuovo utente
     * @param {Object} userData - Dati dell'utente
     * @returns {Promise<Object>} - Token e dati utente
     */
    static async register(userData) {
        // Crea utente usando il model
        const user = await User.create(userData);

        // Se l'utente ha richiesto di essere manager, non generiamo il token
        // perché non può fare login finché non viene approvato
        if (user.manager_request_pending) {
            return {
                token: null,
                user: user.toJSON(),
                message: 'Registrazione completata. La tua richiesta per diventare manager è stata inviata all\'amministratore. Non potrai effettuare il login fino all\'approvazione.',
                canLogin: false
            };
        }

        // Genera token per utenti normali
        const token = this.generateToken(user);

        return {
            token,
            user: user.toJSON(),
            canLogin: true
        };
    }

    /**
     * Effettua login utente
     * @param {string} email - Email utente
     * @param {string} password - Password utente
     * @returns {Promise<Object>} - Token e dati utente
     */
    static async login(email, password) {
        // Validazione input
        if (!email || !password) {
            throw AppError.badRequest('Email e password sono obbligatori');
        }

        // Trova utente per email
        const user = await User.findByEmail(email);
        if (!user) {
            throw AppError.invalidCredentials();
        }

        // Verifica password (normale o temporanea)
        const passwordCheck = await user.verifyPasswordForLogin(password);
        
        if (!passwordCheck.isValid) {
            if (passwordCheck.managerRequestPending) {
                throw AppError.forbidden(passwordCheck.message);
            }
            if (passwordCheck.expired) {
                throw AppError.badRequest('Password temporanea scaduta. Richiedi un nuovo reset password');
            }
            throw AppError.invalidCredentials();
        }

        // Genera token
        const token = this.generateToken(user);

        return {
            token,
            user: user.toJSON(),
            requiresPasswordReset: passwordCheck.requiresReset
        };
    }

    /**
     * Verifica e decodifica token JWT
     * @param {string} token - Token JWT
     * @returns {Promise<User>} - Utente autenticato
     */
    static async verifyToken(token) {
        try {
            // Verifica token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Trova utente nel database
            const user = await User.findById(decoded.id);
            if (!user) {
                throw AppError.unauthorized('L\'utente non esiste più');
            }

            return user;
        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                throw AppError.tokenInvalid();
            }
            if (error.name === 'TokenExpiredError') {
                throw AppError.tokenExpired();
            }
            if (error.name === 'SyntaxError') {
                // Gestisce token con parti Base64 malformate (JSON non valido)
                throw AppError.tokenInvalid();
            }
            throw error;
        }
    }

    /**
     * Genera token JWT per utente
     * @param {User} user - Istanza utente
     * @returns {string} - Token JWT
     */
    static generateToken(user) {
        const payload = {
            id: user.user_id,
            role: user.role,
            email: user.email
        };

        return jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { 
                expiresIn: process.env.JWT_EXPIRES_IN || '24h',
                issuer: 'coworkspace-api',
                audience: 'coworkspace-users'
            }
        );
    }

    /**
     * Genera refresh token (per implementazione futura)
     * @param {User} user - Istanza utente
     * @returns {string} - Refresh token
     */
    static generateRefreshToken(user) {
        const payload = {
            id: user.user_id,
            type: 'refresh'
        };

        return jwt.sign(
            payload,
            process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
            { 
                expiresIn: '7d',
                issuer: 'coworkspace-api',
                audience: 'coworkspace-refresh'
            }
        );
    }

    /**
     * Estrae token dal header Authorization
     * @param {Object} req - Request object
     * @returns {string|null} - Token estratto o null
     */
    static extractTokenFromRequest(req) {
        // Bearer token nell'header Authorization
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            return req.headers.authorization.split(' ')[1];
        }

        // Token nei cookies (per future implementazioni web)
        if (req.cookies && req.cookies.jwt) {
            return req.cookies.jwt;
        }

        return null;
    }

    /**
     * Middleware per autenticazione
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     * @param {Function} next - Next middleware
     */
    static async authenticate(req, res, next) {
        try {
            // Estrai token
            const token = this.extractTokenFromRequest(req);
            if (!token) {
                throw AppError.unauthorized('Token di accesso mancante');
            }

            // Verifica token e ottieni utente
            const user = await this.verifyToken(token);

            // Aggiungi utente alla request
            req.user = user;
            next();
        } catch (error) {
            next(error);
        }
    }

    /**
     * Middleware per autorizzazione basata su ruoli
     * @param {...string} allowedRoles - Ruoli autorizzati
     * @returns {Function} - Middleware function
     */
    static authorize(...allowedRoles) {
        return (req, res, next) => {
            try {
                if (!req.user) {
                    throw AppError.unauthorized('Utente non autenticato');
                }

                if (!req.user.hasAnyRole(allowedRoles)) {
                    throw AppError.forbidden('Non hai il permesso per accedere a questa risorsa');
                }

                next();
            } catch (error) {
                next(error);
            }
        };
    }

    /**
     * Middleware per verificare che l'utente possa accedere solo alle proprie risorse
     * @param {string} userIdParam - Nome del parametro contenente l'ID utente
     * @returns {Function} - Middleware function
     */
    static restrictToOwner(userIdParam = 'userId') {
        return (req, res, next) => {
            try {
                if (!req.user) {
                    throw AppError.unauthorized('Utente non autenticato');
                }

                const resourceUserId = parseInt(req.params[userIdParam]);
                
                // Admin può accedere a tutto
                if (req.user.hasRole('admin')) {
                    return next();
                }

                // Verifica che l'utente acceda solo alle proprie risorse
                if (req.user.user_id !== resourceUserId) {
                    throw AppError.forbidden('Non puoi accedere a risorse di altri utenti');
                }

                next();
            } catch (error) {
                next(error);
            }
        };
    }

    /**
     * Logout utente (per future implementazioni con blacklist token)
     * @param {string} token - Token da invalidare
     * @returns {Promise<boolean>} - True se logout riuscito
     */
    static async logout(token) {
        // TODO: Implementare blacklist token se necessario
        // Per ora, il logout avviene solo lato client rimuovendo il token
        return true;
    }

    /**
     * Cambia password utente autenticato
     * @param {User} user - Utente autenticato
     * @param {string} currentPassword - Password attuale
     * @param {string} newPassword - Nuova password
     * @returns {Promise<boolean>} - True se cambio riuscito
     */
    static async changePassword(user, currentPassword, newPassword) {
        return await user.changePassword(currentPassword, newPassword);
    }

    /**
     * Aggiorna profilo utente autenticato
     * @param {User} user - Utente autenticato
     * @param {Object} updateData - Dati da aggiornare
     * @returns {Promise<User>} - Utente aggiornato
     */
    static async updateProfile(user, updateData) {
        return await user.updateProfile(updateData);
    }

    /**
     * Richiede reset password (password dimenticata)
     * @param {string} email - Email utente
     * @returns {Promise<Object>} - Dati per l'invio email
     */
    static async requestPasswordReset(email) {
        if (!email) {
            throw AppError.badRequest('Email è obbligatoria');
        }

        // Trova utente per email
        const user = await User.findByEmail(email);
        if (!user) {
            // Per sicurezza, non rivelare se l'email esiste o meno
            return { success: true, message: 'Se l\'email è registrata, riceverai le istruzioni per il reset' };
        }

        // Genera password temporanea
        const tempPassword = await user.generateTemporaryPassword();

        return {
            success: true,
            user: user.toJSON(),
            tempPassword: tempPassword,
            message: 'Password temporanea generata con successo'
        };
    }

    /**
     * Imposta flag reset password (da profilo utente)
     * @param {User} user - Utente autenticato
     * @returns {Promise<Object>} - Risultato operazione
     */
    static async initiatePasswordChange(user) {
        await user.requirePasswordReset();
        
        return {
            success: true,
            user: user.toJSON(),
            message: 'Richiesta cambio password impostata. Verrai reindirizzato al cambio password'
        };
    }

    /**
     * Cambia password durante reset
     * @param {User} user - Utente autenticato
     * @param {string} currentPassword - Password attuale o temporanea
     * @param {string} newPassword - Nuova password
     * @returns {Promise<boolean>} - True se cambio riuscito
     */
    static async changePasswordOnReset(user, currentPassword, newPassword) {
        return await user.changePasswordOnReset(currentPassword, newPassword);
    }

    /**
     * Ottieni utente per ID
     * @param {number} userId - ID dell'utente
     * @returns {Promise<User|null>} - Utente trovato o null
     */
    static async getUserById(userId) {
        return await User.findById(userId);
    }

    /**
     * Verifica se un'email è già registrata
     * @param {string} email - Email da verificare
     * @returns {Promise<boolean>} - True se email esiste
     */
    static async checkEmailExists(email) {
        if (!email) {
            throw AppError.badRequest('Email è obbligatoria');
        }

        // Validazione formato email
        User.validateEmail(email);

        const user = await User.findByEmail(email);
        return user !== null;
    }

    /**
     * Cerca utenti per email (ricerca parziale)
     * @param {string} emailPattern - Pattern email da cercare
     * @param {number} limit - Limite risultati
     * @returns {Promise<Array>} - Array di utenti trovati
     */
    static async searchUsersByEmail(emailPattern, limit = 10) {
        if (!emailPattern || emailPattern.length < 3) {
            throw AppError.badRequest('Pattern email deve contenere almeno 3 caratteri');
        }

        return await User.searchByEmail(emailPattern, limit);
    }

    static async updateFcmToken(userId, fcmToken) {
        if (!userId || !fcmToken) {
            throw AppError.badRequest('ID utente e token FCM sono obbligatori');
        }

        const user = await User.findById(userId);
        if (!user) {
            throw AppError.notFound('Utente non trovato');
        }

        user.fcm_token = fcmToken;
        await User.updateFcmToken(user);

        return user;
    }

    /**
     * Ottieni tutti gli utenti con filtri (solo per admin)
     * @param {Object} filters - Filtri di ricerca
     * @returns {Promise<Array>} - Lista utenti
     */
    static async getAllUsers(filters = {}) {
        try {
            const whereConditions = [];
            const params = [];
            let paramIndex = 1;

            // Filtro per ruolo
            if (filters.role) {
                whereConditions.push(`role = $${paramIndex}`);
                params.push(filters.role);
                paramIndex++;
            }

            // Filtro per email (ricerca parziale)
            if (filters.email) {
                whereConditions.push(`LOWER(email) LIKE LOWER($${paramIndex})`);
                params.push(`%${filters.email}%`);
                paramIndex++;
            }

            // Filtro per nome (ricerca parziale)
            if (filters.name) {
                whereConditions.push(`(LOWER(name) LIKE LOWER($${paramIndex}) OR LOWER(surname) LIKE LOWER($${paramIndex}))`);
                params.push(`%${filters.name}%`);
                paramIndex++;
            }

            // Filtro per location (per manager)
            if (filters.location_id) {
                whereConditions.push(`location_id = $${paramIndex}`);
                params.push(filters.location_id);
                paramIndex++;
            }

            let query = `
                SELECT user_id, name, surname, email, role, location_id, created_at, updated_at,
                       manager_request_pending, manager_request_date
                FROM users
            `;

            if (whereConditions.length > 0) {
                query += ` WHERE ${whereConditions.join(' AND ')}`;
            }

            // Ordinamento
            let orderBy = 'created_at DESC'; // Default

            if (filters.sort_by) {
                switch (filters.sort_by) {
                    case 'name_asc':
                        orderBy = 'name ASC, surname ASC';
                        break;
                    case 'name_desc':
                        orderBy = 'name DESC, surname DESC';
                        break;
                    case 'email_asc':
                        orderBy = 'email ASC';
                        break;
                    case 'email_desc':
                        orderBy = 'email DESC';
                        break;
                    case 'role_asc':
                        orderBy = 'role ASC, name ASC';
                        break;
                    case 'role_desc':
                        orderBy = 'role DESC, name ASC';
                        break;
                    case 'created_asc':
                        orderBy = 'created_at ASC';
                        break;
                    case 'created_desc':
                    default:
                        orderBy = 'created_at DESC';
                        break;
                }
            }

            query += ` ORDER BY ${orderBy}`;

            // Limite risultati se specificato
            if (filters.limit && parseInt(filters.limit) > 0) {
                query += ` LIMIT ${parseInt(filters.limit)}`;
            }

            return await User.query(query, params);
        } catch (error) {
            throw AppError.database('Errore nel recupero utenti');
        }
    }

    /**
     * Aggiorna ruolo utente (solo per admin)
     * @param {number} userId - ID dell'utente
     * @param {string} newRole - Nuovo ruolo
     * @param {Object} adminUser - Utente admin che effettua l'operazione
     * @returns {Promise<Object>} - Utente aggiornato
     */
    static async updateUserRole(userId, newRole, adminUser) {
        if (adminUser.role !== 'admin') {
            throw AppError.forbidden('Solo gli admin possono modificare i ruoli');
        }

        const validRoles = ['user', 'manager', 'admin'];
        if (!validRoles.includes(newRole)) {
            throw AppError.badRequest(`Ruolo non valido. Valori ammessi: ${validRoles.join(', ')}`);
        }

        try {
            const user = await User.findById(userId);
            if (!user) {
                throw AppError.notFound('Utente non trovato');
            }

            // Aggiorna ruolo
            const query = `
                UPDATE users 
                SET role = $1, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2
                RETURNING *
            `;

            const result = await User.query(query, [newRole, userId]);
            return result[0];
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw AppError.database('Errore nell\'aggiornamento ruolo utente');
        }
    }

    /**
     * Ottieni tutte le richieste manager pending (solo admin)
     * @param {Object} adminUser - Utente admin che effettua l'operazione
     * @returns {Promise<Array>} - Lista delle richieste pending
     */
    static async getPendingManagerRequests(adminUser) {
        if (adminUser.role !== 'admin') {
            throw AppError.forbidden('Solo gli admin possono visualizzare le richieste manager');
        }

        return await User.getPendingManagerRequests();
    }

    /**
     * Approva richiesta manager (solo admin)
     * @param {number} userId - ID dell'utente da promuovere
     * @param {Object} adminUser - Utente admin che effettua l'operazione
     * @returns {Promise<Object>} - Utente aggiornato
     */
    static async approveManagerRequest(userId, adminUser) {
        if (adminUser.role !== 'admin') {
            throw AppError.forbidden('Solo gli admin possono approvare le richieste manager');
        }

        return await User.approveManagerRequest(userId);
    }

    /**
     * Rifiuta richiesta manager (solo admin)
     * @param {number} userId - ID dell'utente
     * @param {Object} adminUser - Utente admin che effettua l'operazione
     * @returns {Promise<Object>} - Utente aggiornato
     */
    static async rejectManagerRequest(userId, adminUser) {
        if (adminUser.role !== 'admin') {
            throw AppError.forbidden('Solo gli admin possono rifiutare le richieste manager');
        }

        return await User.rejectManagerRequest(userId);
    }

    /**
     * Ottieni dashboard completa per utente normale
     * @param {number} userId - ID dell'utente
     * @returns {Promise<Object>} - Dati dashboard
     */
    static async getUserDashboard(userId) {
        return await User.getDashboard(userId);
    }

    /**
     * Ottieni dashboard completa per manager
     * @param {number} managerId - ID del manager
     * @returns {Promise<Object>} - Dati dashboard manager
     */
    static async getManagerDashboard(managerId) {
        return await User.getManagerDashboard(managerId);
    }
}

module.exports = AuthService;
