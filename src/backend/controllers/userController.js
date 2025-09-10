const AuthService = require('../services/AuthService');
const NotificationService = require('../services/NotificationService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/apiResponse');

/**
 * Registrazione nuovo utente
 */
exports.register = catchAsync(async (req, res, next) => {
    const { name, surname, email, password, requestManagerRole } = req.body;

    // Delega tutta la logica al service
    const result = await AuthService.register({
        name,
        surname, 
        email,
        password,
        requestManagerRole: requestManagerRole || false
    });

    // 📧 Invia email di benvenuto automaticamente
    try {
        await NotificationService.sendUserRegistration(result.user);
        console.log(`📧 Email di benvenuto inviata a: ${result.user.email}`);
    } catch (emailError) {
        console.error('❌ Errore invio email benvenuto:', emailError.message);
        // Non bloccare la registrazione se l'email fallisce
    }

    // 📧 Se è stata richiesta la promozione a manager, invia email all'admin
    if (result.user.manager_request_pending) {
        try {
            await NotificationService.sendManagerRequestNotification(result.user);
            console.log(`📧 Email di richiesta manager inviata all'admin per: ${result.user.email}`);
        } catch (emailError) {
            console.error('❌ Errore invio email richiesta manager:', emailError.message);
            // Non bloccare la registrazione se l'email fallisce
        }
    }

    const statusCode = result.canLogin ? 201 : 202; // 202 = Accepted (pending approval)
    const message = result.message || 'Registrazione avvenuta con successo';

    return ApiResponse.success(res, statusCode, message, {
        token: result.token,
        user: result.user,
        canLogin: result.canLogin
    });
});

/**
 * Login utente
 */
exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // Delega tutta la logica al service
    const result = await AuthService.login(email, password);

    // Se l'utente deve resettare la password, includi l'informazione nella response
    const responseData = {
        token: result.token,
        user: result.user
    };

    if (result.requiresPasswordReset) {
        responseData.requiresPasswordReset = true;
    }

    return ApiResponse.success(res, 200, 'Login avvenuto con successo', responseData);
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

    // Se l'utente è in modalità reset, usa il metodo specifico
    if (req.user.is_password_reset_required) {
        await AuthService.changePasswordOnReset(req.user, currentPassword, newPassword);
    } else {
        // Usa il service per cambiare la password normalmente
        await AuthService.changePassword(req.user, currentPassword, newPassword);
    }

    return ApiResponse.success(res, 200, 'Password modificata con successo');
});

/**
 * Richiede reset password (password dimenticata)
 */
exports.requestPasswordReset = catchAsync(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        throw AppError.badRequest('Email è obbligatoria');
    }

    // Delega al service la logica di reset
    const result = await AuthService.requestPasswordReset(email);

    // Se il reset è andato a buon fine, invia email con password temporanea
    if (result.success && result.tempPassword) {
        try {
            await NotificationService.sendPasswordReset(result.user, result.tempPassword);
            console.log(`📧 Email di reset password inviata a: ${result.user.email}`);
        } catch (emailError) {
            console.error('❌ Errore invio email reset password:', emailError.message);
            // Non bloccare l'operazione se l'email fallisce
        }
    }

    return ApiResponse.success(res, 200, result.message);
});

/**
 * Inizia procedura cambio password dal profilo
 */
exports.initiatePasswordChange = catchAsync(async (req, res, next) => {
    // Imposta il flag per richiedere reset password
    const result = await AuthService.initiatePasswordChange(req.user);

    return ApiResponse.success(res, 200, result.message, {
        user: result.user,
        requiresPasswordReset: true
    });
});

/**
 * Verifica se una email è già registrata nel sistema
 * Funzione pubblica per validazione durante registrazione
 */
exports.checkEmailExists = catchAsync(async (req, res, next) => {
    const { email } = req.query;
    
    if (!email) {
        return next(AppError.badRequest('Email è obbligatoria'));
    }

    const exists = await AuthService.checkEmailExists(email);

    return ApiResponse.success(res, 200, 'Verifica email completata', {
        email,
        exists
    });
});

exports.saveFcmToken = catchAsync(async (req, res, next) => {
    const { fcm_token } = req.body;

    if (!fcm_token) {
        return next(AppError.badRequest('Il token FCM è obbligatorio'));
    }

    // Salva il token FCM nel database
    await AuthService.updateFcmToken(req.user.id, fcm_token);

    return ApiResponse.success(res, 200, 'Token FCM salvato con successo');
});

/**
 * Dashboard utente - Informazioni personali, storico prenotazioni e pagamenti
 */
exports.getDashboard = catchAsync(async (req, res, next) => {
    const userId = req.user.user_id;

    // Ottieni dati dashboard dal service
    const dashboardData = await AuthService.getUserDashboard(userId);

    return ApiResponse.success(res, 200, 'Dashboard utente recuperata con successo', dashboardData);
});
