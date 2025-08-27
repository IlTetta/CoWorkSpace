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

// Mock catchAsync
jest.mock('../../src/backend/utils/catchAsync', () => {
    return jest.fn((fn) => {
        return async (req, res, next) => {
            try {
                await fn(req, res, next);
            } catch (error) {
                next(error);
            }
        };
    });
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

    describe('Validazione campi obbligatori', () => {
        it('dovrebbe restituire errore se manca il nome', async () => {
            req.body.name = '';

            await userController.register(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            const error = next.mock.calls[0][0];
            expect(error.message).toBe('Tutti i campi sono obbligatori.');
            expect(error.statusCode).toBe(400);
            expect(db.query).not.toHaveBeenCalled();
        });

        it('dovrebbe restituire errore se manca il cognome', async () => {
            req.body.surname = null;

            await userController.register(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            const error = next.mock.calls[0][0];
            expect(error.message).toBe('Tutti i campi sono obbligatori.');
            expect(error.statusCode).toBe(400);
        });

        it('dovrebbe restituire errore se manca l\'email', async () => {
            delete req.body.email;

            await userController.register(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            const error = next.mock.calls[0][0];
            expect(error.message).toBe('Tutti i campi sono obbligatori.');
            expect(error.statusCode).toBe(400);
        });

        it('dovrebbe restituire errore se manca il ruolo', async () => {
            req.body.role = undefined;

            await userController.register(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            const error = next.mock.calls[0][0];
            expect(error.message).toBe('Tutti i campi sono obbligatori.');
            expect(error.statusCode).toBe(400);
        });

        it('dovrebbe restituire errore se tutti i campi sono vuoti', async () => {
            req.body = {
                name: '',
                surname: '',
                email: '',
                password: '',
                role: ''
            };

            await userController.register(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            const error = next.mock.calls[0][0];
            expect(error.message).toBe('Tutti i campi sono obbligatori.');
            expect(error.statusCode).toBe(400);
        });

        it('dovrebbe accettare tutti i campi validi', async () => {
            const validUser = {
                user_id: 1,
                email: 'valid@example.com',
                role: 'admin'
            };

            req.body = {
                name: 'Valid',
                surname: 'User',
                email: 'valid@example.com',
                password: 'validPassword123',
                role: 'admin'
            };

            bcrypt.genSalt.mockResolvedValue('salt123');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            db.query.mockResolvedValue({ rows: [validUser] });
            jwt.sign.mockReturnValue('token');

            await userController.register(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('Hashing della password', () => {
        it('dovrebbe generare salt con complessità 10', async () => {
            const newUser = {
                user_id: 1,
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            bcrypt.genSalt.mockResolvedValue('salt123');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            db.query.mockResolvedValue({ rows: [newUser] });
            jwt.sign.mockReturnValue('token');

            await userController.register(req, res, next);

            expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
        });

        it('dovrebbe hashare la password con il salt generato', async () => {
            const newUser = {
                user_id: 1,
                email: 'mario.rossi@example.com',
                role: 'user'
            };
            const mockSalt = 'mockSalt123';

            bcrypt.genSalt.mockResolvedValue(mockSalt);
            bcrypt.hash.mockResolvedValue('hashedPassword');
            db.query.mockResolvedValue({ rows: [newUser] });
            jwt.sign.mockReturnValue('token');

            await userController.register(req, res, next);

            expect(bcrypt.hash).toHaveBeenCalledWith('password123', mockSalt);
        });

        it('dovrebbe gestire errore nella generazione del salt', async () => {
            const saltError = new Error('Salt generation failed');
            bcrypt.genSalt.mockRejectedValue(saltError);

            await userController.register(req, res, next);

            expect(next).toHaveBeenCalledWith(saltError);
            expect(bcrypt.hash).not.toHaveBeenCalled();
            expect(db.query).not.toHaveBeenCalled();
        });

        it('dovrebbe gestire errore nell\'hashing della password', async () => {
            const hashError = new Error('Password hashing failed');
            bcrypt.genSalt.mockResolvedValue('salt123');
            bcrypt.hash.mockRejectedValue(hashError);

            await userController.register(req, res, next);

            expect(next).toHaveBeenCalledWith(hashError);
            expect(db.query).not.toHaveBeenCalled();
        });
    });

    describe('Inserimento nel database', () => {
        it('dovrebbe chiamare db.query con i parametri corretti', async () => {
            const newUser = {
                user_id: 1,
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            bcrypt.genSalt.mockResolvedValue('salt123');
            bcrypt.hash.mockResolvedValue('hashedPassword123');
            db.query.mockResolvedValue({ rows: [newUser] });
            jwt.sign.mockReturnValue('token');

            await userController.register(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                `INSERT INTO users (name, surname, email, password_hash, role)
           VALUES ($1, $2, $3, $4, $5) RETURNING user_id, email, role`,
                ['Mario', 'Rossi', 'mario.rossi@example.com', 'hashedPassword123', 'user']
            );
        });

        it('dovrebbe restituire solo i campi necessari dall\'insert', async () => {
            const newUser = {
                user_id: 1,
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            bcrypt.genSalt.mockResolvedValue('salt123');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            db.query.mockResolvedValue({ rows: [newUser] });
            jwt.sign.mockReturnValue('token');

            await userController.register(req, res, next);

            const query = db.query.mock.calls[0][0];
            expect(query).toContain('RETURNING user_id, email, role');
            
            // Verifica che la clausola RETURNING non contenga campi sensibili
            const returningClause = query.split('RETURNING')[1];
            expect(returningClause).not.toContain('password_hash');
            expect(returningClause).not.toContain('name');
            expect(returningClause).not.toContain('surname');
        });

        it('dovrebbe gestire diversi ruoli utente', async () => {
            const adminUser = {
                user_id: 2,
                email: 'admin@example.com',
                role: 'admin'
            };

            req.body.role = 'admin';
            req.body.email = 'admin@example.com';

            bcrypt.genSalt.mockResolvedValue('salt123');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            db.query.mockResolvedValue({ rows: [adminUser] });
            jwt.sign.mockReturnValue('adminToken');

            await userController.register(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                expect.any(String),
                ['Mario', 'Rossi', 'admin@example.com', 'hashedPassword', 'admin']
            );
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: expect.objectContaining({
                        role: 'admin'
                    })
                })
            );
        });
    });

    describe('Generazione JWT', () => {
        it('dovrebbe generare JWT con payload corretto', async () => {
            const newUser = {
                user_id: 5,
                email: 'test@example.com',
                role: 'moderator'
            };

            bcrypt.genSalt.mockResolvedValue('salt123');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            db.query.mockResolvedValue({ rows: [newUser] });
            jwt.sign.mockReturnValue('testToken');

            await userController.register(req, res, next);

            expect(jwt.sign).toHaveBeenCalledWith(
                { id: 5, role: 'moderator' },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
        });

        it('dovrebbe utilizzare JWT_SECRET dall\'environment', async () => {
            const newUser = {
                user_id: 1,
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            bcrypt.genSalt.mockResolvedValue('salt123');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            db.query.mockResolvedValue({ rows: [newUser] });
            jwt.sign.mockReturnValue('token');

            await userController.register(req, res, next);

            expect(jwt.sign).toHaveBeenCalledWith(
                expect.any(Object),
                process.env.JWT_SECRET,
                expect.any(Object)
            );
        });

        it('dovrebbe impostare scadenza token a 1 ora', async () => {
            const newUser = {
                user_id: 1,
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            bcrypt.genSalt.mockResolvedValue('salt123');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            db.query.mockResolvedValue({ rows: [newUser] });
            jwt.sign.mockReturnValue('token');

            await userController.register(req, res, next);

            expect(jwt.sign).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(String),
                { expiresIn: '1h' }
            );
        });

        it('dovrebbe gestire errore nella generazione JWT', async () => {
            const newUser = {
                user_id: 1,
                email: 'mario.rossi@example.com',
                role: 'user'
            };
            const jwtError = new Error('JWT generation failed');

            bcrypt.genSalt.mockResolvedValue('salt123');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            db.query.mockResolvedValue({ rows: [newUser] });
            jwt.sign.mockImplementation(() => {
                throw jwtError;
            });

            await userController.register(req, res, next);

            expect(next).toHaveBeenCalledWith(jwtError);
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe('Validazione dati di risposta', () => {
        it('dovrebbe restituire il formato di risposta corretto', async () => {
            const newUser = {
                user_id: 1,
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            bcrypt.genSalt.mockResolvedValue('salt123');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            db.query.mockResolvedValue({ rows: [newUser] });
            jwt.sign.mockReturnValue('testToken');

            await userController.register(req, res, next);

            const response = res.json.mock.calls[0][0];
            expect(response).toHaveProperty('message', 'Registrazione avvenuta con successo.');
            expect(response).toHaveProperty('token', 'testToken');
            expect(response).toHaveProperty('user');
            expect(response.user).toHaveProperty('id', 1);
            expect(response.user).toHaveProperty('email', 'mario.rossi@example.com');
            expect(response.user).toHaveProperty('role', 'user');
        });

        it('dovrebbe restituire solo i campi sicuri dell\'utente', async () => {
            const newUser = {
                user_id: 1,
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            bcrypt.genSalt.mockResolvedValue('salt123');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            db.query.mockResolvedValue({ rows: [newUser] });
            jwt.sign.mockReturnValue('token');

            await userController.register(req, res, next);

            const response = res.json.mock.calls[0][0];
            expect(response.user).not.toHaveProperty('password_hash');
            expect(response.user).not.toHaveProperty('name');
            expect(response.user).not.toHaveProperty('surname');
            expect(response.user).not.toHaveProperty('created_at');
        });

        it('dovrebbe mappare user_id a id nella risposta', async () => {
            const newUser = {
                user_id: 123,
                email: 'test@example.com',
                role: 'admin'
            };

            bcrypt.genSalt.mockResolvedValue('salt123');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            db.query.mockResolvedValue({ rows: [newUser] });
            jwt.sign.mockReturnValue('token');

            await userController.register(req, res, next);

            const response = res.json.mock.calls[0][0];
            expect(response.user.id).toBe(123);
            expect(response.user).not.toHaveProperty('user_id');
        });
    });

    describe('Gestione errori avanzata', () => {
        it('dovrebbe gestire errore di constraint check', async () => {
            const constraintError = new Error('Check constraint violation');
            constraintError.code = '23514';

            bcrypt.genSalt.mockResolvedValue('salt123');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            db.query.mockRejectedValue(constraintError);

            await userController.register(req, res, next);

            expect(next).toHaveBeenCalledWith(constraintError);
        });

        it('dovrebbe gestire errore di foreign key', async () => {
            const fkError = new Error('Foreign key constraint violation');
            fkError.code = '23503';

            bcrypt.genSalt.mockResolvedValue('salt123');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            db.query.mockRejectedValue(fkError);

            await userController.register(req, res, next);

            expect(next).toHaveBeenCalledWith(fkError);
        });

        it('dovrebbe gestire timeout del database', async () => {
            const timeoutError = new Error('Query timeout');
            timeoutError.code = 'ETIMEDOUT';

            bcrypt.genSalt.mockResolvedValue('salt123');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            db.query.mockRejectedValue(timeoutError);

            await userController.register(req, res, next);

            expect(next).toHaveBeenCalledWith(timeoutError);
        });
    });

    describe('Casi edge', () => {
        it('dovrebbe gestire email con caratteri speciali', async () => {
            const newUser = {
                user_id: 1,
                email: 'test+special@example-domain.co.uk',
                role: 'user'
            };

            req.body.email = 'test+special@example-domain.co.uk';

            bcrypt.genSalt.mockResolvedValue('salt123');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            db.query.mockResolvedValue({ rows: [newUser] });
            jwt.sign.mockReturnValue('token');

            await userController.register(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(db.query).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining(['test+special@example-domain.co.uk'])
            );
        });

        it('dovrebbe gestire password con caratteri speciali', async () => {
            const newUser = {
                user_id: 1,
                email: 'mario.rossi@example.com',
                role: 'user'
            };
            const complexPassword = 'P@ssw0rd!#$%^&*()';

            req.body.password = complexPassword;

            bcrypt.genSalt.mockResolvedValue('salt123');
            bcrypt.hash.mockResolvedValue('hashedComplexPassword');
            db.query.mockResolvedValue({ rows: [newUser] });
            jwt.sign.mockReturnValue('token');

            await userController.register(req, res, next);

            expect(bcrypt.hash).toHaveBeenCalledWith(complexPassword, 'salt123');
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('dovrebbe gestire nomi con caratteri unicode', async () => {
            const newUser = {
                user_id: 1,
                email: 'jose@example.com',
                role: 'user'
            };

            req.body.name = 'José';
            req.body.surname = 'García';
            req.body.email = 'jose@example.com';

            bcrypt.genSalt.mockResolvedValue('salt123');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            db.query.mockResolvedValue({ rows: [newUser] });
            jwt.sign.mockReturnValue('token');

            await userController.register(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                expect.any(String),
                ['José', 'García', 'jose@example.com', 'hashedPassword', 'user']
            );
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('dovrebbe gestire stringhe molto lunghe', async () => {
            const newUser = {
                user_id: 1,
                email: 'test@example.com',
                role: 'user'
            };
            const longName = 'A'.repeat(100);

            req.body.name = longName;
            req.body.email = 'test@example.com';

            bcrypt.genSalt.mockResolvedValue('salt123');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            db.query.mockResolvedValue({ rows: [newUser] });
            jwt.sign.mockReturnValue('token');

            await userController.register(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                expect.any(String),
                [longName, 'Rossi', 'test@example.com', 'hashedPassword', 'user']
            );
        });
    });
});

describe('userController.login', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {
                email: 'mario.rossi@example.com',
                password: 'password123'
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Login con successo', () => {
        it('dovrebbe fare login con credenziali valide', async () => {
            const mockUser = {
                user_id: 1,
                email: 'mario.rossi@example.com',
                password_hash: 'hashedPassword123',
                role: 'user',
                name: 'Mario',
                surname: 'Rossi'
            };
            const mockToken = 'mock-jwt-token';

            db.query.mockResolvedValue({ rows: [mockUser] });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue(mockToken);

            await userController.login(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Login avvenuto con successo.',
                token: mockToken,
                user: {
                    id: mockUser.user_id,
                    email: mockUser.email,
                    role: mockUser.role
                }
            });
        });

        it('dovrebbe fare login per utente admin', async () => {
            const mockAdmin = {
                user_id: 2,
                email: 'admin@example.com',
                password_hash: 'hashedAdminPassword',
                role: 'admin',
                name: 'Admin',
                surname: 'User'
            };
            const mockToken = 'admin-jwt-token';

            req.body.email = 'admin@example.com';
            db.query.mockResolvedValue({ rows: [mockAdmin] });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue(mockToken);

            await userController.login(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Login avvenuto con successo.',
                token: mockToken,
                user: {
                    id: mockAdmin.user_id,
                    email: mockAdmin.email,
                    role: 'admin'
                }
            });
        });
    });

    describe('Validazione campi obbligatori', () => {
        it('dovrebbe restituire errore se manca l\'email', async () => {
            req.body.email = '';

            await userController.login(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            const error = next.mock.calls[0][0];
            expect(error.message).toBe('Email e password sono obbligatori.');
            expect(error.statusCode).toBe(400);
            expect(res.status).not.toHaveBeenCalled();
            expect(db.query).not.toHaveBeenCalled();
        });

        it('dovrebbe restituire errore se manca la password', async () => {
            req.body.password = null;

            await userController.login(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            const error = next.mock.calls[0][0];
            expect(error.message).toBe('Email e password sono obbligatori.');
            expect(error.statusCode).toBe(400);
            expect(res.status).not.toHaveBeenCalled();
            expect(db.query).not.toHaveBeenCalled();
        });

        it('dovrebbe restituire errore se email è undefined', async () => {
            delete req.body.email;

            await userController.login(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            const error = next.mock.calls[0][0];
            expect(error.message).toBe('Email e password sono obbligatori.');
            expect(error.statusCode).toBe(400);
        });

        it('dovrebbe restituire errore se password è undefined', async () => {
            delete req.body.password;

            await userController.login(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            const error = next.mock.calls[0][0];
            expect(error.message).toBe('Email e password sono obbligatori.');
            expect(error.statusCode).toBe(400);
        });

        it('dovrebbe restituire errore se entrambi i campi mancano', async () => {
            req.body = {};

            await userController.login(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            const error = next.mock.calls[0][0];
            expect(error.message).toBe('Email e password sono obbligatori.');
            expect(error.statusCode).toBe(400);
        });
    });

    describe('Utente non trovato', () => {
        it('dovrebbe restituire errore se l\'utente non esiste', async () => {
            db.query.mockResolvedValue({ rows: [] });

            await userController.login(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            const error = next.mock.calls[0][0];
            expect(error.message).toBe('Credenziali non valide.');
            expect(error.statusCode).toBe(400);
            expect(res.status).not.toHaveBeenCalled();
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        it('dovrebbe chiamare db.query con email corretta', async () => {
            const testEmail = 'test@example.com';
            req.body.email = testEmail;
            db.query.mockResolvedValue({ rows: [] });

            await userController.login(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'SELECT * FROM users WHERE email = $1',
                [testEmail]
            );
        });
    });

    describe('Password non valida', () => {
        it('dovrebbe restituire errore se la password è sbagliata', async () => {
            const mockUser = {
                user_id: 1,
                email: 'mario.rossi@example.com',
                password_hash: 'hashedPassword123',
                role: 'user'
            };

            db.query.mockResolvedValue({ rows: [mockUser] });
            bcrypt.compare.mockResolvedValue(false);

            await userController.login(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            const error = next.mock.calls[0][0];
            expect(error.message).toBe('Credenziali non valide.');
            expect(error.statusCode).toBe(400);
            expect(res.status).not.toHaveBeenCalled();
            expect(jwt.sign).not.toHaveBeenCalled();
        });

        it('dovrebbe chiamare bcrypt.compare con parametri corretti', async () => {
            const mockUser = {
                user_id: 1,
                email: 'mario.rossi@example.com',
                password_hash: 'hashedPassword123',
                role: 'user'
            };

            db.query.mockResolvedValue({ rows: [mockUser] });
            bcrypt.compare.mockResolvedValue(false);

            await userController.login(req, res, next);

            expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
        });
    });

    describe('Generazione JWT', () => {
        it('dovrebbe generare JWT con payload corretto', async () => {
            const mockUser = {
                user_id: 5,
                email: 'test@example.com',
                password_hash: 'hashedPassword',
                role: 'moderator',
                name: 'Test',
                surname: 'User'
            };

            db.query.mockResolvedValue({ rows: [mockUser] });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('test-token');

            await userController.login(req, res, next);

            expect(jwt.sign).toHaveBeenCalledWith(
                { id: 5, role: 'moderator' },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
        });

        it('dovrebbe includere il token nella risposta', async () => {
            const mockUser = {
                user_id: 1,
                email: 'mario.rossi@example.com',
                password_hash: 'hashedPassword123',
                role: 'user'
            };
            const expectedToken = 'specific-test-token';

            db.query.mockResolvedValue({ rows: [mockUser] });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue(expectedToken);

            await userController.login(req, res, next);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    token: expectedToken
                })
            );
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore del database', async () => {
            const dbError = new Error('Database connection failed');
            db.query.mockRejectedValue(dbError);

            await userController.login(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('dovrebbe gestire errore di bcrypt.compare', async () => {
            const mockUser = {
                user_id: 1,
                email: 'mario.rossi@example.com',
                password_hash: 'hashedPassword123',
                role: 'user'
            };
            const bcryptError = new Error('Bcrypt comparison failed');

            db.query.mockResolvedValue({ rows: [mockUser] });
            bcrypt.compare.mockRejectedValue(bcryptError);

            await userController.login(req, res, next);

            expect(next).toHaveBeenCalledWith(bcryptError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('dovrebbe gestire errore di jwt.sign', async () => {
            const mockUser = {
                user_id: 1,
                email: 'mario.rossi@example.com',
                password_hash: 'hashedPassword123',
                role: 'user'
            };
            const jwtError = new Error('JWT signing failed');

            db.query.mockResolvedValue({ rows: [mockUser] });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockImplementation(() => {
                throw jwtError;
            });

            await userController.login(req, res, next);

            expect(next).toHaveBeenCalledWith(jwtError);
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe('Formati email diversi', () => {
        it('dovrebbe accettare email con domini diversi', async () => {
            const mockUser = {
                user_id: 1,
                email: 'user@gmail.com',
                password_hash: 'hashedPassword',
                role: 'user'
            };

            req.body.email = 'user@gmail.com';
            db.query.mockResolvedValue({ rows: [mockUser] });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('token');

            await userController.login(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(db.query).toHaveBeenCalledWith(
                'SELECT * FROM users WHERE email = $1',
                ['user@gmail.com']
            );
        });

        it('dovrebbe gestire email case-insensitive', async () => {
            const mockUser = {
                user_id: 1,
                email: 'User@Example.COM',
                password_hash: 'hashedPassword',
                role: 'user'
            };

            req.body.email = 'User@Example.COM';
            db.query.mockResolvedValue({ rows: [mockUser] });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('token');

            await userController.login(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('Password diverse', () => {
        it('dovrebbe gestire password con caratteri speciali', async () => {
            const mockUser = {
                user_id: 1,
                email: 'mario.rossi@example.com',
                password_hash: 'hashedSpecialPassword',
                role: 'user'
            };
            const specialPassword = 'P@ssw0rd!#$%';

            req.body.password = specialPassword;
            db.query.mockResolvedValue({ rows: [mockUser] });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('token');

            await userController.login(req, res, next);

            expect(bcrypt.compare).toHaveBeenCalledWith(specialPassword, 'hashedSpecialPassword');
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('dovrebbe gestire password molto lunghe', async () => {
            const mockUser = {
                user_id: 1,
                email: 'mario.rossi@example.com',
                password_hash: 'hashedLongPassword',
                role: 'user'
            };
            const longPassword = 'a'.repeat(100);

            req.body.password = longPassword;
            db.query.mockResolvedValue({ rows: [mockUser] });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('token');

            await userController.login(req, res, next);

            expect(bcrypt.compare).toHaveBeenCalledWith(longPassword, 'hashedLongPassword');
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('Risposta formato', () => {
        it('dovrebbe restituire solo i campi necessari dell\'utente', async () => {
            const mockUser = {
                user_id: 1,
                email: 'mario.rossi@example.com',
                password_hash: 'hashedPassword123',
                role: 'user',
                name: 'Mario',
                surname: 'Rossi',
                created_at: '2023-01-01',
                updated_at: '2023-01-01'
            };

            db.query.mockResolvedValue({ rows: [mockUser] });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('token');

            await userController.login(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                message: 'Login avvenuto con successo.',
                token: 'token',
                user: {
                    id: 1,
                    email: 'mario.rossi@example.com',
                    role: 'user'
                }
            });

            // Verifica che campi sensibili NON siano inclusi
            const responseCall = res.json.mock.calls[0][0];
            expect(responseCall.user).not.toHaveProperty('password_hash');
            expect(responseCall.user).not.toHaveProperty('name');
            expect(responseCall.user).not.toHaveProperty('surname');
        });

        it('dovrebbe avere il formato di risposta corretto', async () => {
            const mockUser = {
                user_id: 1,
                email: 'mario.rossi@example.com',
                password_hash: 'hashedPassword123',
                role: 'user'
            };

            db.query.mockResolvedValue({ rows: [mockUser] });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('token');

            await userController.login(req, res, next);

            const response = res.json.mock.calls[0][0];
            expect(response).toHaveProperty('message');
            expect(response).toHaveProperty('token');
            expect(response).toHaveProperty('user');
            expect(response.user).toHaveProperty('id');
            expect(response.user).toHaveProperty('email');
            expect(response.user).toHaveProperty('role');
        });
    });
});

describe('userController.getProfile', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: {
                id: 1
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Recupero profilo con successo', () => {
        it('dovrebbe restituire il profilo dell\'utente', async () => {
            const mockUser = {
                user_id: 1,
                name: 'Mario',
                surname: 'Rossi',
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            db.query.mockResolvedValue({ rows: [mockUser] });

            await userController.getProfile(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                user: mockUser
            });
        });

        it('dovrebbe chiamare db.query con l\'ID utente corretto', async () => {
            const mockUser = {
                user_id: 5,
                name: 'Test',
                surname: 'User',
                email: 'test@example.com',
                role: 'admin'
            };

            req.user.id = 5;
            db.query.mockResolvedValue({ rows: [mockUser] });

            await userController.getProfile(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'SELECT user_id, name, surname, email, role FROM users WHERE user_id = $1',
                [5]
            );
        });

        it('dovrebbe funzionare per utenti con ruoli diversi', async () => {
            const mockAdmin = {
                user_id: 2,
                name: 'Admin',
                surname: 'User',
                email: 'admin@example.com',
                role: 'admin'
            };

            req.user.id = 2;
            db.query.mockResolvedValue({ rows: [mockAdmin] });

            await userController.getProfile(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                user: mockAdmin
            });
        });
    });

    describe('Utente non trovato', () => {
        it('dovrebbe restituire errore 404 se l\'utente non esiste', async () => {
            db.query.mockResolvedValue({ rows: [] });

            await userController.getProfile(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            const error = next.mock.calls[0][0];
            expect(error.message).toBe('Utente non trovato.');
            expect(error.statusCode).toBe(404);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('dovrebbe gestire il caso in cui db.query restituisce undefined', async () => {
            db.query.mockResolvedValue({ rows: [undefined] });

            await userController.getProfile(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            const error = next.mock.calls[0][0];
            expect(error.message).toBe('Utente non trovato.');
            expect(error.statusCode).toBe(404);
        });

        it('dovrebbe gestire il caso in cui il primo elemento dell\'array è falsy', async () => {
            db.query.mockResolvedValue({ rows: [null] });

            await userController.getProfile(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            const error = next.mock.calls[0][0];
            expect(error.message).toBe('Utente non trovato.');
            expect(error.statusCode).toBe(404);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore del database', async () => {
            const dbError = new Error('Database connection failed');
            db.query.mockRejectedValue(dbError);

            await userController.getProfile(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('dovrebbe gestire errore di timeout del database', async () => {
            const timeoutError = new Error('Query timeout');
            timeoutError.code = 'ETIMEDOUT';
            db.query.mockRejectedValue(timeoutError);

            await userController.getProfile(req, res, next);

            expect(next).toHaveBeenCalledWith(timeoutError);
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe('Validazione dati di risposta', () => {
        it('dovrebbe restituire tutti i campi del profilo utente', async () => {
            const mockUser = {
                user_id: 1,
                name: 'Mario',
                surname: 'Rossi',
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            db.query.mockResolvedValue({ rows: [mockUser] });

            await userController.getProfile(req, res, next);

            const response = res.json.mock.calls[0][0];
            expect(response).toHaveProperty('user');
            expect(response.user).toHaveProperty('user_id', 1);
            expect(response.user).toHaveProperty('name', 'Mario');
            expect(response.user).toHaveProperty('surname', 'Rossi');
            expect(response.user).toHaveProperty('email', 'mario.rossi@example.com');
            expect(response.user).toHaveProperty('role', 'user');
        });

        it('dovrebbe restituire il formato di risposta corretto', async () => {
            const mockUser = {
                user_id: 1,
                name: 'Mario',
                surname: 'Rossi',
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            db.query.mockResolvedValue({ rows: [mockUser] });

            await userController.getProfile(req, res, next);

            const response = res.json.mock.calls[0][0];
            expect(response).toEqual({
                user: mockUser
            });
            expect(response).not.toHaveProperty('message');
            expect(response).not.toHaveProperty('token');
        });
    });

    describe('Middleware di autenticazione', () => {
        it('dovrebbe usare l\'ID utente dal middleware di autenticazione', async () => {
            const userId = 123;
            const mockUser = {
                user_id: userId,
                name: 'Test',
                surname: 'User',
                email: 'test@example.com',
                role: 'user'
            };

            req.user.id = userId;
            db.query.mockResolvedValue({ rows: [mockUser] });

            await userController.getProfile(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'SELECT user_id, name, surname, email, role FROM users WHERE user_id = $1',
                [userId]
            );
        });

        it('dovrebbe funzionare con diversi tipi di ID utente', async () => {
            const stringId = '456';
            const mockUser = {
                user_id: parseInt(stringId),
                name: 'String',
                surname: 'ID',
                email: 'string@example.com',
                role: 'user'
            };

            req.user.id = stringId;
            db.query.mockResolvedValue({ rows: [mockUser] });

            await userController.getProfile(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'SELECT user_id, name, surname, email, role FROM users WHERE user_id = $1',
                [stringId]
            );
        });
    });

    describe('Query del database', () => {
        it('dovrebbe selezionare solo i campi necessari', async () => {
            const mockUser = {
                user_id: 1,
                name: 'Mario',
                surname: 'Rossi',
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            db.query.mockResolvedValue({ rows: [mockUser] });

            await userController.getProfile(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'SELECT user_id, name, surname, email, role FROM users WHERE user_id = $1',
                [1]
            );

            // Verifica che la query non includa campi sensibili come password_hash
            const query = db.query.mock.calls[0][0];
            expect(query).not.toContain('password_hash');
            expect(query).not.toContain('*');
        });

        it('dovrebbe chiamare db.query una sola volta', async () => {
            const mockUser = {
                user_id: 1,
                name: 'Mario',
                surname: 'Rossi',
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            db.query.mockResolvedValue({ rows: [mockUser] });

            await userController.getProfile(req, res, next);

            expect(db.query).toHaveBeenCalledTimes(1);
        });
    });
});

describe('userController.updateProfile', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: {
                id: 1
            },
            body: {
                name: 'Mario Nuovo',
                surname: 'Rossi Nuovo',
                email: 'mario.nuovo@example.com'
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Aggiornamento profilo con successo', () => {
        it('dovrebbe aggiornare tutti i campi del profilo', async () => {
            const updatedUser = {
                user_id: 1,
                name: 'Mario Nuovo',
                surname: 'Rossi Nuovo',
                email: 'mario.nuovo@example.com',
                role: 'user'
            };

            // Mock per controllo email esistente (nessun conflitto)
            db.query.mockResolvedValueOnce({ rows: [] });
            // Mock per update
            db.query.mockResolvedValueOnce({ rows: [updatedUser] });

            await userController.updateProfile(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Profilo aggiornato con successo.',
                user: updatedUser
            });
        });

        it('dovrebbe aggiornare solo il nome', async () => {
            const updatedUser = {
                user_id: 1,
                name: 'Solo Nome',
                surname: 'Rossi',
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            req.body = { name: 'Solo Nome' };

            // Solo una chiamata per l'update (nessun controllo email)
            db.query.mockResolvedValueOnce({ rows: [updatedUser] });

            await userController.updateProfile(req, res, next);

            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).toHaveBeenCalledWith(
                `UPDATE users SET
            name = COALESCE($1, name),
            surname = COALESCE($2, surname),
            email = COALESCE($3, email)
        WHERE user_id = $4
        RETURNING user_id, name, surname, email, role`,
                ['Solo Nome', undefined, undefined, 1]
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('dovrebbe aggiornare solo il cognome', async () => {
            const updatedUser = {
                user_id: 1,
                name: 'Mario',
                surname: 'Solo Cognome',
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            req.body = { surname: 'Solo Cognome' };

            db.query.mockResolvedValueOnce({ rows: [updatedUser] });

            await userController.updateProfile(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                `UPDATE users SET
            name = COALESCE($1, name),
            surname = COALESCE($2, surname),
            email = COALESCE($3, email)
        WHERE user_id = $4
        RETURNING user_id, name, surname, email, role`,
                [undefined, 'Solo Cognome', undefined, 1]
            );
        });

        it('dovrebbe aggiornare solo l\'email se non è in conflitto', async () => {
            const updatedUser = {
                user_id: 1,
                name: 'Mario',
                surname: 'Rossi',
                email: 'nuova.email@example.com',
                role: 'user'
            };

            req.body = { email: 'nuova.email@example.com' };

            // Mock per controllo email esistente (nessun conflitto)
            db.query.mockResolvedValueOnce({ rows: [] });
            // Mock per update
            db.query.mockResolvedValueOnce({ rows: [updatedUser] });

            await userController.updateProfile(req, res, next);

            expect(db.query).toHaveBeenCalledTimes(2);
            expect(db.query).toHaveBeenNthCalledWith(1,
                'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
                ['nuova.email@example.com', 1]
            );
        });

        it('dovrebbe funzionare con body vuoto', async () => {
            const unchangedUser = {
                user_id: 1,
                name: 'Mario',
                surname: 'Rossi',
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            req.body = {};

            db.query.mockResolvedValueOnce({ rows: [unchangedUser] });

            await userController.updateProfile(req, res, next);

            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).toHaveBeenCalledWith(
                `UPDATE users SET
            name = COALESCE($1, name),
            surname = COALESCE($2, surname),
            email = COALESCE($3, email)
        WHERE user_id = $4
        RETURNING user_id, name, surname, email, role`,
                [undefined, undefined, undefined, 1]
            );
        });
    });

    describe('Controllo email duplicata', () => {
        it('dovrebbe restituire errore 409 se l\'email è già in uso', async () => {
            const existingUser = { user_id: 2 };

            req.body = { email: 'email.esistente@example.com' };

            // Mock per controllo email esistente (conflitto trovato)
            db.query.mockResolvedValueOnce({ rows: [existingUser] });

            await userController.updateProfile(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            const error = next.mock.calls[0][0];
            expect(error.message).toBe('Email già in uso.');
            expect(error.statusCode).toBe(409);
            expect(res.status).not.toHaveBeenCalled();

            // Verifica che non sia stata chiamata la query di update
            expect(db.query).toHaveBeenCalledTimes(1);
        });

        it('dovrebbe permettere di mantenere la stessa email dell\'utente', async () => {
            const updatedUser = {
                user_id: 1,
                name: 'Mario Aggiornato',
                surname: 'Rossi',
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            req.body = {
                name: 'Mario Aggiornato',
                email: 'mario.rossi@example.com' // Stessa email dell'utente
            };

            // Mock per controllo email - nessun altro utente ha questa email
            db.query.mockResolvedValueOnce({ rows: [] });
            // Mock per update
            db.query.mockResolvedValueOnce({ rows: [updatedUser] });

            await userController.updateProfile(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(db.query).toHaveBeenCalledWith(
                'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
                ['mario.rossi@example.com', 1]
            );
        });

        it('non dovrebbe controllare l\'email se non è fornita', async () => {
            const updatedUser = {
                user_id: 1,
                name: 'Solo Nome',
                surname: 'Rossi',
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            req.body = { name: 'Solo Nome' };

            // Solo una chiamata per l'update
            db.query.mockResolvedValueOnce({ rows: [updatedUser] });

            await userController.updateProfile(req, res, next);

            expect(db.query).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('non dovrebbe controllare l\'email se è una stringa vuota', async () => {
            const updatedUser = {
                user_id: 1,
                name: 'Mario',
                surname: 'Rossi',
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            req.body = {
                name: 'Mario',
                email: '' // Stringa vuota
            };

            // Solo una chiamata per l'update
            db.query.mockResolvedValueOnce({ rows: [updatedUser] });

            await userController.updateProfile(req, res, next);

            expect(db.query).toHaveBeenCalledTimes(1);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore del database nel controllo email', async () => {
            const dbError = new Error('Database connection failed');

            req.body = { email: 'test@example.com' };

            db.query.mockRejectedValueOnce(dbError);

            await userController.updateProfile(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('dovrebbe gestire errore del database nell\'update', async () => {
            const dbError = new Error('Update failed');

            req.body = { name: 'Test' };

            db.query.mockRejectedValueOnce(dbError);

            await userController.updateProfile(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('dovrebbe gestire errore del database nell\'update dopo controllo email', async () => {
            const updateError = new Error('Update query failed');

            req.body = { email: 'nuova@example.com', name: 'Test' };

            // Prima query (controllo email) va bene
            db.query.mockResolvedValueOnce({ rows: [] });
            // Seconda query (update) fallisce
            db.query.mockRejectedValueOnce(updateError);

            await userController.updateProfile(req, res, next);

            expect(next).toHaveBeenCalledWith(updateError);
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe('Middleware di autenticazione', () => {
        it('dovrebbe usare l\'ID utente dal middleware di autenticazione', async () => {
            const userId = 456;
            const updatedUser = {
                user_id: userId,
                name: 'Test',
                surname: 'User',
                email: 'test@example.com',
                role: 'user'
            };

            req.user.id = userId;
            req.body = { name: 'Test' };

            db.query.mockResolvedValueOnce({ rows: [updatedUser] });

            await userController.updateProfile(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                `UPDATE users SET
            name = COALESCE($1, name),
            surname = COALESCE($2, surname),
            email = COALESCE($3, email)
        WHERE user_id = $4
        RETURNING user_id, name, surname, email, role`,
                ['Test', undefined, undefined, userId]
            );
        });

        it('dovrebbe funzionare con diversi tipi di ID utente', async () => {
            const stringId = '789';
            const updatedUser = {
                user_id: parseInt(stringId),
                name: 'String',
                surname: 'ID',
                email: 'string@example.com',
                role: 'user'
            };

            req.user.id = stringId;
            req.body = { surname: 'ID' };

            db.query.mockResolvedValueOnce({ rows: [updatedUser] });

            await userController.updateProfile(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                `UPDATE users SET
            name = COALESCE($1, name),
            surname = COALESCE($2, surname),
            email = COALESCE($3, email)
        WHERE user_id = $4
        RETURNING user_id, name, surname, email, role`,
                [undefined, 'ID', undefined, stringId]
            );
        });
    });

    describe('Query del database', () => {
        it('dovrebbe utilizzare COALESCE per aggiornamenti parziali', async () => {
            const updatedUser = {
                user_id: 1,
                name: 'Nuovo Nome',
                surname: 'Rossi',
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            req.body = { name: 'Nuovo Nome' };

            db.query.mockResolvedValueOnce({ rows: [updatedUser] });

            await userController.updateProfile(req, res, next);

            const query = db.query.mock.calls[0][0];
            expect(query).toContain('COALESCE($1, name)');
            expect(query).toContain('COALESCE($2, surname)');
            expect(query).toContain('COALESCE($3, email)');
        });

        it('dovrebbe restituire tutti i campi necessari', async () => {
            const updatedUser = {
                user_id: 1,
                name: 'Mario',
                surname: 'Rossi',
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            req.body = { name: 'Mario' };

            db.query.mockResolvedValueOnce({ rows: [updatedUser] });

            await userController.updateProfile(req, res, next);

            const query = db.query.mock.calls[0][0];
            expect(query).toContain('RETURNING user_id, name, surname, email, role');
        });

        it('dovrebbe escludere la password_hash dai campi restituiti', async () => {
            const updatedUser = {
                user_id: 1,
                name: 'Mario',
                surname: 'Rossi',
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            req.body = { name: 'Mario' };

            db.query.mockResolvedValueOnce({ rows: [updatedUser] });

            await userController.updateProfile(req, res, next);

            const query = db.query.mock.calls[0][0];
            expect(query).not.toContain('password_hash');
        });
    });

    describe('Validazione dati di risposta', () => {
        it('dovrebbe restituire il formato di risposta corretto', async () => {
            const updatedUser = {
                user_id: 1,
                name: 'Mario Aggiornato',
                surname: 'Rossi Aggiornato',
                email: 'mario.aggiornato@example.com',
                role: 'user'
            };

            req.body = {
                name: 'Mario Aggiornato',
                surname: 'Rossi Aggiornato',
                email: 'mario.aggiornato@example.com'
            };

            db.query.mockResolvedValueOnce({ rows: [] }); // Controllo email
            db.query.mockResolvedValueOnce({ rows: [updatedUser] }); // Update

            await userController.updateProfile(req, res, next);

            const response = res.json.mock.calls[0][0];
            expect(response).toHaveProperty('message', 'Profilo aggiornato con successo.');
            expect(response).toHaveProperty('user', updatedUser);
            expect(response).not.toHaveProperty('token');
        });

        it('dovrebbe restituire l\'utente aggiornato completo', async () => {
            const updatedUser = {
                user_id: 1,
                name: 'Test',
                surname: 'User',
                email: 'test@example.com',
                role: 'admin'
            };

            req.body = { role: 'admin' }; // Anche se role non dovrebbe essere aggiornabile tramite questo endpoint

            db.query.mockResolvedValueOnce({ rows: [updatedUser] });

            await userController.updateProfile(req, res, next);

            const response = res.json.mock.calls[0][0];
            expect(response.user).toHaveProperty('user_id', 1);
            expect(response.user).toHaveProperty('name', 'Test');
            expect(response.user).toHaveProperty('surname', 'User');
            expect(response.user).toHaveProperty('email', 'test@example.com');
            expect(response.user).toHaveProperty('role', 'admin');
        });
    });

    describe('Casi edge', () => {
        it('dovrebbe gestire valori null nei campi di input', async () => {
            const updatedUser = {
                user_id: 1,
                name: 'Mario',
                surname: 'Rossi',
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            req.body = {
                name: null,
                surname: null,
                email: null
            };

            db.query.mockResolvedValueOnce({ rows: [updatedUser] });

            await userController.updateProfile(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                `UPDATE users SET
            name = COALESCE($1, name),
            surname = COALESCE($2, surname),
            email = COALESCE($3, email)
        WHERE user_id = $4
        RETURNING user_id, name, surname, email, role`,
                [null, null, null, 1]
            );
        });

        it('dovrebbe gestire stringhe vuote nei campi', async () => {
            const updatedUser = {
                user_id: 1,
                name: '',
                surname: '',
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            req.body = {
                name: '',
                surname: ''
                // email non fornita (stringa vuota non dovrebbe triggerare il controllo)
            };

            db.query.mockResolvedValueOnce({ rows: [updatedUser] });

            await userController.updateProfile(req, res, next);

            expect(db.query).toHaveBeenCalledTimes(1); // Solo update, no controllo email
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('dovrebbe gestire email con formati diversi', async () => {
            const updatedUser = {
                user_id: 1,
                name: 'Mario',
                surname: 'Rossi',
                email: 'mario.rossi+test@example-domain.co.uk',
                role: 'user'
            };

            req.body = {
                email: 'mario.rossi+test@example-domain.co.uk'
            };

            db.query.mockResolvedValueOnce({ rows: [] }); // Controllo email
            db.query.mockResolvedValueOnce({ rows: [updatedUser] }); // Update

            await userController.updateProfile(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(db.query).toHaveBeenNthCalledWith(1,
                'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
                ['mario.rossi+test@example-domain.co.uk', 1]
            );
        });
    });
});