const AuthService = require('../services/AuthService');
const NotificationService = require('../services/NotificationService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/apiResponse');

/**
 * Registrazione nuovo utente
 */
exports.register = catchAsync(async (req, res, next) => {
    const { name, surname, email, password, role } = req.body;

    // Delega tutta la logica al service
    const result = await AuthService.register({
        name,
        surname, 
        email,
        password,
        role
    });

    // 📧 Invia email di benvenuto automaticamente
    try {
        await NotificationService.sendUserRegistration(result.user);
        console.log(`📧 Email di benvenuto inviata a: ${result.user.email}`);
    } catch (emailError) {
        console.error('❌ Errore invio email benvenuto:', emailError.message);
        // Non bloccare la registrazione se l'email fallisce
    }

    return ApiResponse.created(res, 'Registrazione avvenuta con successo', {
        token: result.token,
        user: result.user
    });
});

/**
 * Login utente
 */
exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // Delega tutta la logica al service
    const result = await AuthService.login(email, password);

    return ApiResponse.success(res, 200, 'Login avvenuto con successo', {
        token: result.token,
        user: result.user
    });
});

/**
 * Ottieni profilo utente autenticato
 */
exports.getProfile = catchAsync(async (req, res, next) => {
    // req.user è già popolato dal middleware di autenticazione
    const userProfile = {
        user_id: req.user.user_id,
        name: req.user.name,
        surname: req.user.surname,
        email: req.user.email,
        role: req.user.role,
        created_at: req.user.created_at
    };

    return ApiResponse.success(res, 200, 'Profilo utente recuperato con successo', {
        user: userProfile
    });
});

/**
 * Logout utente
 */
exports.logout = catchAsync(async (req, res, next) => {
    // Estrae token dalla request
    const token = AuthService.extractTokenFromRequest(req);
    
    // Effettua logout (per ora solo client-side)
    await AuthService.logout(token);

    return ApiResponse.success(res, 200, 'Logout effettuato con successo');
});

/**
 * Aggiorna profilo utente
 */
exports.updateProfile = catchAsync(async (req, res, next) => {
    const { name, surname, email } = req.body;

    // Usa il service per aggiornare il profilo
    const updatedUser = await AuthService.updateProfile(req.user, {
        name,
        surname,
        email
    });

    return ApiResponse.updated(res, {
        user: updatedUser.toJSON()
    }, 'Profilo aggiornato con successo');
});

/**
 * Cambia password utente
 */
exports.changePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw AppError.badRequest('Password attuale e nuova password sono obbligatorie');
    }

    // Usa il service per cambiare la password
    await AuthService.changePassword(req.user, currentPassword, newPassword);

    return ApiResponse.success(res, 200, 'Password modificata con successo');
});
