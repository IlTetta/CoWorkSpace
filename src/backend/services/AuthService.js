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

        // Genera token
        const token = this.generateToken(user);

        return {
            token,
            user: user.toJSON()
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
}

module.exports = AuthService;
