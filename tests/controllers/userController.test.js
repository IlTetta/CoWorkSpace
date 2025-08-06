// tests/controllers/userController.test.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../src/backend/config/db');

// Setup mock
jest.mock('../../src/backend/config/db');
jest.mock('../../src/backend/utils/catchAsync', () => (fn) => fn);

// Mock bcrypt completamente
jest.mock('bcryptjs', () => ({
    genSalt: jest.fn(),
    hash: jest.fn(),
    compare: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn()
}));

// Mock catchAsync - passa semplicemente la funzione attraverso
jest.mock('../../src/backend/utils/catchAsync', () => {
    return jest.fn((fn) => fn);
});

// Mock AppError come classe
jest.mock('../../src/backend/utils/AppError', () => {
    return jest.fn().mockImplementation((message, statusCode) => {
        const error = new Error(message);
        error.statusCode = statusCode;
        error.message = message;
        return error;
    });
});

const AppError = require('../../src/backend/utils/AppError');
const userController = require('../../src/backend/controllers/userController');

describe('userController.register', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {
                name: 'Mario',
                surname: 'Rossi',
                email: 'mario.rossi@example.com',
                password: 'password123',
                role: 'user',
            },
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn(),
        };
        next = jest.fn();

        jest.clearAllMocks();
    });

    it('dovrebbe registrare un nuovo utente e restituire un token', async () => {
        const hashedPassword = 'hashedPassword';
        const newUser = {
            user_id: 1,
            email: 'mario.rossi@example.com',
            role: 'user',
        };
        const mockToken = 'mock-jwt-token';

        // Setup mocks - assicurati che tutti siano async/await compatible
        bcrypt.genSalt.mockResolvedValue('salt123');
        bcrypt.hash.mockResolvedValue(hashedPassword);
        db.query.mockResolvedValue({ rows: [newUser] });
        jwt.sign.mockReturnValue(mockToken);
        
        await userController.register(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Registrazione avvenuta con successo.',
            token: mockToken,
            user: {
                id: newUser.user_id,
                email: newUser.email,
                role: newUser.role,
            },
        });
        expect(db.query).toHaveBeenCalledTimes(1);
    });

    it('dovrebbe restituire un errore 400 se i campi obbligatori mancano', async () => {
        req.body.password = '';

        await userController.register(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
        expect(db.query).not.toHaveBeenCalled();

        const errorInstance = next.mock.calls[0][0];
        expect(errorInstance.message).toBe('Tutti i campi sono obbligatori.');
        expect(errorInstance.statusCode).toBe(400);
    });

    it('dovrebbe restituire un errore 409 se l\'email è già registrata', async () => {
        const uniqueViolationError = new Error('duplicate key value violates unique constraint');
        uniqueViolationError.code = '23505';

        bcrypt.genSalt.mockResolvedValue('salt123');
        bcrypt.hash.mockResolvedValue('hashedPassword');
        db.query.mockRejectedValue(uniqueViolationError);

        await userController.register(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();

        const errorInstance = next.mock.calls[0][0];
        expect(errorInstance.message).toBe('Email già registrata.');
        expect(errorInstance.statusCode).toBe(409);
    });

    it('dovrebbe passare un errore generico del database al middleware next', async () => {
        const genericError = new Error('Database connection failed');
        
        bcrypt.genSalt.mockResolvedValue('salt123');
        bcrypt.hash.mockResolvedValue('hashedPassword');
        db.query.mockRejectedValue(genericError);

        await userController.register(req, res, next);

        expect(next).toHaveBeenCalledWith(genericError);
    });
});