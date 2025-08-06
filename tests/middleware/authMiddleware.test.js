// test/middleware/authMiddlewareMiddleware.test.js
const jwt = require('jsonwebtoken');
const db = require('../../src/backend/config/db');
const { protect, authorize } = require('../../src/backend/middleware/authMiddleware');
const AppError = require('../../src/backend/utils/AppError');

// Mock della funzione di query del database
jest.mock('../../src/backend/config/db', () => ({
    query: jest.fn(),
}));

// Mock della libreria jsonwebtoken
jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            headers: {},
            cookies: {},
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn(),
        };
        next = jest.fn();
    });

    describe('protect', () => {
        const mockUser = { user_id: 1, email: 'test@example.com', role: 'user' };
        const mockToken = 'mockToken123';

        it('dovrebbe chiamare next() se il token è valido e l\'utente esiste', async () => {
            req.headers.authorization = `Bearer ${mockToken}`;
            jwt.verify.mockReturnValue({ id: mockUser.user_id });
            db.query.mockResolvedValue({ rows: [mockUser] });

            await protect(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expect(req.user).toEqual(mockUser);
        });

        it('dovrebbe restituire 401 se non c\'è un token', async () => {
            await protect(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith(new AppError('Non sei loggato!', 401));
            expect(next).not.toHaveBeenCalledWith();
        });

        it('dovrebbe restituire 401 se non c\'è un token', async () => {
            await protect(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            const error = next.mock.calls[0][0];

            expect(error).toBeInstanceOf(AppError);
            expect(error.message).toBe('Non sei loggato!');
            expect(error.statusCode).toBe(401);
        });

        it('dovrebbe restituire 401 se l\'utente non esiste più nel database', async () => {
            req.headers.authorization = `Bearer ${mockToken}`;
            jwt.verify.mockReturnValue({ id: mockUser.user_id });
            db.query.mockResolvedValue({ rows: [] }); // Simula utente non trovato

            await protect(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith(new AppError('L\'utente non esiste più!', 401));
            expect(next).not.toHaveBeenCalledWith();
        });
    });

    describe('authorize', () => {
        const mockUserAdmin = { user_id: 1, role: 'admin' };
        const mockUserUser = { user_id: 2, role: 'user' };

        it('dovrebbe chiamare next() se l\'utente ha il ruolo corretto', () => {
            req.user = mockUserAdmin;
            const middleware = authorize('admin', 'user');

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith();
        });

        it('dovrebbe restituire 403 se l\'utente non ha il ruolo corretto', () => {
            req.user = mockUserUser;
            const middleware = authorize('admin'); // Ruolo richiesto: 'admin'

            middleware(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith(new AppError('Non hai il permesso per accedere a questa risorsa!', 403));
            expect(next).not.toHaveBeenCalledWith();
        });
    });
});