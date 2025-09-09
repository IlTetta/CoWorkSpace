// src/backend/controllers/adminController.js
/**
 * Controller Admin completo - ROLE_REDESIGN.md compliant
 * Controllo completo del sistema: utenti, location, configurazioni, override manager
 */
const AuthService = require('../services/AuthService');
const LocationService = require('../services/LocationService');
const BookingService = require('../services/BookingService');
const PaymentService = require('../services/PaymentService');
const SpaceService = require('../services/SpaceService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/apiResponse');

/**
 * Dashboard sistema per admin - Stats complete
 */
exports.getSystemDashboard = catchAsync(async (req, res, next) => {
    if (req.user.role !== 'admin') {
        throw AppError.forbidden('Accesso riservato agli amministratori');
    }

    const [
        allUsers,
        allLocations,
        recentBookings,
        recentPayments
    ] = await Promise.all([
        AuthService.getAllUsers(),
        LocationService.getLocations({}, req.user),
        BookingService.getBookings(req.user, { limit: 10 }),
        PaymentService.getPayments(req.user, { limit: 10 })
    ]);

    return ApiResponse.success(res, 200, 'Dashboard sistema recuperata', {
        users: {
            total: allUsers.length,
            by_role: allUsers.reduce((acc, user) => {
                acc[user.role] = (acc[user.role] || 0) + 1;
                return acc;
            }, {}),
            recent: allUsers.slice(0, 5)
        },
        locations: {
            total: allLocations.length,
            with_managers: allLocations.filter(l => l.manager_id).length,
            without_managers: allLocations.filter(l => !l.manager_id).length,
            list: allLocations.slice(0, 5)
        },
        bookings: {
            recent: recentBookings,
            total: recentBookings.length
        },
        payments: {
            recent: recentPayments,
            total: recentPayments.length
        }
    });
});

// ========================================
// GESTIONE UTENTI (CRUD completo)
// ========================================

/**
 * Recupera tutti gli utenti del sistema
 */
exports.getAllUsers = catchAsync(async (req, res, next) => {
    if (req.user.role !== 'admin') {
        throw AppError.forbidden('Solo gli admin possono vedere tutti gli utenti');
    }

    const filters = {
        role: req.query.role,
        email: req.query.email,
        name: req.query.name
    };

    const users = await AuthService.getAllUsers(filters);

    return ApiResponse.success(res, 200, 'Utenti recuperati', {
        users: users,
        total: users.length,
        filters_applied: Object.keys(filters).filter(key => filters[key])
    });
});

/**
 * Recupera singolo utente
 */
exports.getUserById = catchAsync(async (req, res, next) => {
    if (req.user.role !== 'admin') {
        throw AppError.forbidden('Solo gli admin possono vedere i dettagli utenti');
    }

    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
        throw AppError.badRequest('ID utente non valido');
    }

    const user = await AuthService.getUserById(userId);
    if (!user) {
        throw AppError.notFound('Utente non trovato');
    }

    return ApiResponse.success(res, 200, 'Utente recuperato', { user });
});

/**
 * Crea nuovo utente (admin può creare qualsiasi ruolo)
 */
exports.createUser = catchAsync(async (req, res, next) => {
    if (req.user.role !== 'admin') {
        throw AppError.forbidden('Solo gli admin possono creare utenti');
    }

    const userData = {
        name: req.body.name,
        surname: req.body.surname,
        email: req.body.email,
        password: req.body.password,
        role: req.body.role || 'user'
    };

    // Validazione ruolo
    const validRoles = ['user', 'manager', 'admin'];
    if (!validRoles.includes(userData.role)) {
        throw AppError.badRequest(`Ruolo non valido. Valori ammessi: ${validRoles.join(', ')}`);
    }

    const result = await AuthService.register(userData);

    return ApiResponse.created(res, 'Utente creato con successo', {
        user: result.user,
        created_by_admin: req.user.user_id
    });
});

/**
 * Aggiorna utente esistente
 */
exports.updateUser = catchAsync(async (req, res, next) => {
    if (req.user.role !== 'admin') {
        throw AppError.forbidden('Solo gli admin possono modificare utenti');
    }

    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
        throw AppError.badRequest('ID utente non valido');
    }

    // Verifica che l'utente esista
    const existingUser = await AuthService.getUserById(userId);
    if (!existingUser) {
        throw AppError.notFound('Utente non trovato');
    }

    const updateData = {
        name: req.body.name,
        surname: req.body.surname,
        email: req.body.email
    };

    // Gestione cambio ruolo se specificato
    if (req.body.role && req.body.role !== existingUser.role) {
        const validRoles = ['user', 'manager', 'admin'];
        if (!validRoles.includes(req.body.role)) {
            throw AppError.badRequest(`Ruolo non valido. Valori ammessi: ${validRoles.join(', ')}`);
        }
        await AuthService.updateUserRole(userId, req.body.role, req.user);
    }

    // Aggiorna profilo
    const updatedUser = await AuthService.updateProfile({ user_id: userId }, updateData);

    return ApiResponse.updated(res, {
        user: updatedUser,
        updated_by_admin: req.user.user_id
    }, 'Utente aggiornato con successo');
});

/**
 * Cambia ruolo utente
 */
exports.updateUserRole = catchAsync(async (req, res, next) => {
    if (req.user.role !== 'admin') {
        throw AppError.forbidden('Solo gli admin possono cambiare i ruoli');
    }

    const userId = parseInt(req.params.userId);
    const newRole = req.body.role;

    if (isNaN(userId)) {
        throw AppError.badRequest('ID utente non valido');
    }

    const validRoles = ['user', 'manager', 'admin'];
    if (!validRoles.includes(newRole)) {
        throw AppError.badRequest(`Ruolo non valido. Valori ammessi: ${validRoles.join(', ')}`);
    }

    const result = await AuthService.updateUserRole(userId, newRole, req.user);

    return ApiResponse.updated(res, result, 'Ruolo utente aggiornato con successo');
});

// ========================================
// GESTIONE LOCATION (CRUD completo)
// ========================================

/**
 * Recupera tutte le location
 */
exports.getAllLocations = catchAsync(async (req, res, next) => {
    if (req.user.role !== 'admin') {
        throw AppError.forbidden('Solo gli admin possono vedere tutte le location');
    }

    const filters = {
        name: req.query.name,
        city: req.query.city,
        manager_id: req.query.manager_id
    };

    const locations = await LocationService.getLocations(filters, req.user);

    return ApiResponse.success(res, 200, 'Location recuperate', {
        locations: locations,
        total: locations.length,
        filters_applied: Object.keys(filters).filter(key => filters[key])
    });
});

/**
 * Crea nuova location
 */
exports.createLocation = catchAsync(async (req, res, next) => {
    if (req.user.role !== 'admin') {
        throw AppError.forbidden('Solo gli admin possono creare location');
    }

    const locationData = {
        name: req.body.name,
        address: req.body.address,
        city: req.body.city,
        province: req.body.province,
        postal_code: req.body.postal_code,
        country: req.body.country || 'IT',
        phone: req.body.phone,
        email: req.body.email,
        description: req.body.description,
        manager_id: req.body.manager_id || null
    };

    // Verifica manager se specificato
    if (locationData.manager_id) {
        const manager = await AuthService.getUserById(locationData.manager_id);
        if (!manager) {
            throw AppError.notFound('Manager specificato non trovato');
        }
        if (manager.role !== 'manager') {
            throw AppError.badRequest('L\'utente deve avere il ruolo di manager');
        }
    }

    const location = await LocationService.createLocation(locationData, req.user);

    return ApiResponse.created(res, 'Location creata con successo', {
        location: location,
        created_by_admin: req.user.user_id
    });
});

/**
 * Aggiorna location
 */
exports.updateLocation = catchAsync(async (req, res, next) => {
    if (req.user.role !== 'admin') {
        throw AppError.forbidden('Solo gli admin possono modificare location');
    }

    const locationId = parseInt(req.params.locationId);
    if (isNaN(locationId)) {
        throw AppError.badRequest('ID location non valido');
    }

    const updateData = {
        name: req.body.name,
        address: req.body.address,
        city: req.body.city,
        province: req.body.province,
        postal_code: req.body.postal_code,
        phone: req.body.phone,
        email: req.body.email,
        description: req.body.description,
        manager_id: req.body.manager_id
    };

    // Verifica manager se specificato
    if (updateData.manager_id) {
        const manager = await AuthService.getUserById(updateData.manager_id);
        if (!manager) {
            throw AppError.notFound('Manager specificato non trovato');
        }
        if (manager.role !== 'manager') {
            throw AppError.badRequest('L\'utente deve avere il ruolo di manager');
        }
    }

    const location = await LocationService.updateLocation(locationId, updateData, req.user);

    return ApiResponse.updated(res, {
        location: location,
        updated_by_admin: req.user.user_id
    }, 'Location aggiornata con successo');
});

/**
 * Elimina location
 */
exports.deleteLocation = catchAsync(async (req, res, next) => {
    if (req.user.role !== 'admin') {
        throw AppError.forbidden('Solo gli admin possono eliminare location');
    }

    const locationId = parseInt(req.params.locationId);
    if (isNaN(locationId)) {
        throw AppError.badRequest('ID location non valido');
    }

    const result = await LocationService.deleteLocation(locationId, req.user);

    return ApiResponse.deleted(res, {
        location_id: locationId,
        deleted_by_admin: req.user.user_id
    }, 'Location eliminata con successo');
});

/**
 * Assegna manager a una location
 */
exports.assignManagerToLocation = catchAsync(async (req, res, next) => {
    const locationId = parseInt(req.params.locationId);
    const managerId = req.body.manager_id;

    if (isNaN(locationId)) {
        throw AppError.badRequest('ID location non valido');
    }

    if (!managerId) {
        throw AppError.badRequest('ID manager obbligatorio');
    }

    // Verifica che il manager esista e abbia il ruolo corretto
    const manager = await AuthService.getUserById(managerId);
    if (!manager) {
        throw AppError.notFound('Manager non trovato');
    }

    if (manager.role !== 'manager') {
        throw AppError.badRequest('L\'utente deve avere il ruolo di manager');
    }

    const location = await LocationService.updateLocation(locationId, { 
        manager_id: managerId 
    }, req.user);

    return ApiResponse.updated(res, {
        location: location,
        manager: {
            id: manager.user_id,
            name: `${manager.name} ${manager.surname}`,
            email: manager.email
        }
    }, 'Manager assegnato alla location');
});

// ========================================
// OVERRIDE MANAGER - Admin può fare tutto sui tutti i spazi/bookings/payments
// ========================================

/**
 * Recupera tutti gli spazi del sistema (override manager)
 */
exports.getAllSpaces = catchAsync(async (req, res, next) => {
    if (req.user.role !== 'admin') {
        throw AppError.forbidden('Solo gli admin possono vedere tutti gli spazi');
    }

    const filters = {
        location_id: req.query.location_id,
        space_type_id: req.query.space_type_id,
        name: req.query.name
    };

    // Admin bypass: imposta role temporaneo per vedere tutto
    const adminAsManager = { ...req.user, role: 'admin' };
    const spaces = await SpaceService.getSpaces(filters, adminAsManager);

    return ApiResponse.success(res, 200, 'Tutti gli spazi del sistema', {
        spaces: spaces,
        total: spaces.length,
        message: 'Admin override - Visione completa sistema'
    });
});

/**
 * Crea spazio in qualsiasi location (override manager)
 */
exports.createSpace = catchAsync(async (req, res, next) => {
    if (req.user.role !== 'admin') {
        throw AppError.forbidden('Solo gli admin possono creare spazi ovunque');
    }

    const spaceData = {
        location_id: req.body.location_id,
        space_type_id: req.body.space_type_id,
        name: req.body.name,
        description: req.body.description,
        capacity: req.body.capacity,
        hourly_rate: req.body.hourly_rate,
        opening_time: req.body.opening_time,
        closing_time: req.body.closing_time,
        available_days: req.body.available_days
    };

    // Admin bypass: può creare spazi in qualsiasi location
    const space = await SpaceService.createSpace(spaceData, { ...req.user, role: 'admin' });

    return ApiResponse.created(res, 'Spazio creato con successo (Admin override)', {
        space: space,
        created_by_admin: req.user.user_id
    });
});

/**
 * Recupera tutte le prenotazioni del sistema (override manager)
 */
exports.getAllBookings = catchAsync(async (req, res, next) => {
    if (req.user.role !== 'admin') {
        throw AppError.forbidden('Solo gli admin possono vedere tutte le prenotazioni');
    }

    const filters = {
        user_id: req.query.user_id,
        location_id: req.query.location_id,
        status: req.query.status,
        date_from: req.query.date_from,
        date_to: req.query.date_to
    };

    // Admin vede TUTTO il sistema
    const bookings = await BookingService.getBookings(req.user, filters);

    return ApiResponse.success(res, 200, 'Tutte le prenotazioni del sistema', {
        bookings: bookings,
        total: bookings.length,
        message: 'Admin override - Visione completa sistema'
    });
});

/**
 * Recupera tutti i pagamenti del sistema (override manager)
 */
exports.getAllPayments = catchAsync(async (req, res, next) => {
    if (req.user.role !== 'admin') {
        throw AppError.forbidden('Solo gli admin possono vedere tutti i pagamenti');
    }

    const filters = {
        user_id: req.query.user_id,
        booking_id: req.query.booking_id,
        status: req.query.status,
        method: req.query.method
    };

    // Admin vede TUTTO il sistema
    const payments = await PaymentService.getPayments(req.user, filters);

    return ApiResponse.success(res, 200, 'Tutti i pagamenti del sistema', {
        payments: payments,
        total: payments.length,
        message: 'Admin override - Visione completa sistema'
    });
});

