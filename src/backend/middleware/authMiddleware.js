// src/backend/middleware/authMiddleware.js
const AuthService = require('../services/AuthService');

// Middleware per autenticazione - delega tutto al service
exports.protect = (req, res, next) => AuthService.authenticate(req, res, next);

// Middleware per autorizzazione - delega tutto al service
exports.authorize = (...roles) => (req, res, next) => AuthService.authorize(...roles)(req, res, next);

// Middleware per accesso solo alle proprie risorse
exports.restrictToOwner = (req, res, next) => AuthService.restrictToOwner(req, res, next);