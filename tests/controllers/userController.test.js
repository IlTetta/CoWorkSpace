// tests/controllers/userController.test.js
const userController = require('../../src/backend/controllers/userController');
const db = require('../../src/backend/config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AppError = require('../../src/backend/utils/AppError');

jest.mock('../../src/backend/config/db');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('User Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = { body: {}, user: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    describe('register', () => {
        it('dovrebbe ritornare 400 se i campi obbligatori mancano', async () => {
            req.body = { name: 'Test' };

            await userController.register(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            expect(next.mock.calls[0][0].message).toBe('Tutti i campi sono obbligatori.');
            expect(next.mock.calls[0][0].statusCode).toBe(400);
        });

        it('dovrebbe registrare un nuovo utente e restituire un token', async () => {
            req.body = {
                name: 'Test',
                surname: 'User',
                email: 'test@example.com',
                password: 'password123',
                role: 'user'
            }

            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            db.query.mockResolvedValue({
                rows: [{ user_id: 1, email: 'test@example.com' }]
            });
            jwt.sign.mockReturnValue('mockToken');

            await userController.register(req, res, next);

            expect(bcrypt.genSalt).toHaveBeenCalled();
            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
            expect(db.query).toHaveBeenCalled();
            expect(jwt.sign).toHaveBeenCalledWith(
                { id: 1, role: 'user' },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Registrazione avvenuta con successo.',
                token: 'jwtToken',
                user: expect.objectContaining({
                    id: 1,
                    email: 'test@example.com',
                    role: 'user'
                })
            }));
        });

        it('dovrebbe chiamare next con AppError se l\'email è già registrata', async () => {
            req.body = {
                name: 'Test',
                surname: 'User',
                email: 'test@example.com',
                password: 'password123',
                role: 'user'
            };

            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            const error = new Error();
            error.code = '23505'; // Unique violation
            db.query.mockRejectedValue(error);

            await userController.register(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            expect(next.mock.calls[0][0].message).toBe('Email già registrata.');
            expect(next.mock.calls[0][0].statusCode).toBe(409);

        });
    });

    describe('login', () => {
        it('dovrebbe ritornare 400 se email o password mancano', async () => {
            req.body = { email: 'test@example.com' };

            await userController.login(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            expect(next.mock.calls[0][0].message).toBe('Email e password sono obbligatori.');
            expect(next.mock.calls[0][0].statusCode).toBe(400);
        });

        it('dovrebbe restituire 400 se l\'utente non esiste', async () => {
            req.body = { email: 'test@example.com', password: 'password123' };
            db.query.mockResolvedValue({ rows: [] });

            await userController.login(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            expect(next.mock.calls[0][0].message).toBe('Credenziali non valide.');
            expect(next.mock.calls[0][0].statusCode).toBe(400);
        });

        it('dovrebbe restituire 400 se la password è errata', async () => {
            req.body = { email: 'test@example.com', password: 'wrongPassword' };
            db.query.mockResolvedValue({
                rows: [{ user_id: 1, email: 'test@example.com', password_hash: 'hashedPassword', role: 'user' }]
            });
            bcrypt.compare.mockResolvedValue(false);

            await userController.login(req, res, next);

            expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
            expect(next.mock.calls[0][0].message).toBe('Credenziali non valide.');
            expect(next.mock.calls[0][0].statusCode).toBe(400);
        });

        it('dovrebbe restituire un token se il login ha successo', async () => {
            req.body = { email: 'test@example.com', password: 'correctPassword' };
            db.query.mockResolvedValue({
                rows: [{ user_id: 1, email: 'test@example.com', password_hash: 'hashedPassword', role: 'user' }]
            });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('jwtToken');

            await userController.login(req, res, next);

            expect(jwt.sign).toHaveBeenCalledWith(
                { id: 1, role: 'user' },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Login avvenuto con successo.',
                token: 'jwtToken',
                user: expect.objectContaining({
                    id: 1,
                    email: 'test@example.com',
                    role: 'user'
                })
            }));
        });

        describe('getProfile', () => {
            it('dovrebbe restituire 404 se l\'utente non esiste', async () => {
                req.user.id = 1;
                db.query.mockResolvedValue({ rows: [] });

                await userController.getProfile(req, res, next);

                expect(next).toHaveBeenCalledWith(expect.any(AppError));
                expect(next.mock.calls[0][0].message).toBe('Utente non trovato.');
                expect(next.mock.calls[0][0].statusCode).toBe(404);
            });

            it('dovrebbe restituire i dati dell\'utente se esiste', async () => {
                req.user.id = 1;
                db.query.mockResolvedValue({
                    rows: [{ user_id: 1, name: 'Test', surname: 'User', email: 'test@example.com', role: 'user' }]
                });

                await userController.getProfile(req, res, next);

                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                    id: 1,
                    name: 'Test',
                    surname: 'User',
                    email: 'test@example.com',
                    role: 'user'
                }));
            });
        });

        describe('logout', () => {
            it('dovrebbe pulire il cookie jwt', () => {
                res.cookie = jest.fn();

                userController.logout(req, res);
                expect(res.cookie).toHaveBeenCalledWith('jwt', '', { maxAge: 0, httpOnly: true });
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledWith({ message: 'Logout avvenuto con successo.' });
            });
        });

        describe('updateProfile', () => {
            it('dovrebbe restituire 404 se la mail è già in uso', async () => {
                req.user.id = 1;
                req.body = { email: 'test@example.com' };
                db.query.mockResolvedValue({ rows: [{ user_id: 2 }] });

                await userController.updateProfile(req, res, next);

                expect(next).toHaveBeenCalledWith(expect.any(AppError));
                expect(next.mock.calls[0][0].message).toBe('Email già in uso.');
                expect(next.mock.calls[0][0].statusCode).toBe(409);
            });

            it('dovrebbe aggiornare il profilo dell\'utente e restituire i nuovi dati', async () => {
                req.user.id = 1;
                req.body = { name: 'Updated Name', surname: 'Updated Surname', email: 'updated@example.com' };
                db.query.mockResolvedValue({ rows: [] });
                db.query.mockResolvedValue({ rows: [{ user_id: 1, ...req.body, role: 'user' }] });

                await userController.updateProfile(req, res, next);

                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                    message: 'Profilo aggiornato con successo.',
                    user: expect.objectContaining({
                        user_id: 1,
                        name: 'Updated Name',
                        surname: 'Updated Surname',
                        email: 'updated@example.com',
                        role: 'user'
                    })
                }));
            });
        });
    });
});