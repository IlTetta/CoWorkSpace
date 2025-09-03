const User = require('../../../src/backend/models/User');
const pool = require('../../../src/backend/config/db');
const bcrypt = require('bcryptjs');
const AppError = require('../../../src/backend/utils/AppError');

// Mock del database pool
jest.mock('../../../src/backend/config/db', () => ({
    query: jest.fn()
}));

// Mock di bcrypt
jest.mock('bcryptjs', () => ({
    genSalt: jest.fn(),
    hash: jest.fn(),
    compare: jest.fn()
}));

describe('User Model', () => {
    let mockUser;
    let mockUserData;

    beforeEach(() => {
        jest.clearAllMocks();

        // Dati mock per l'utente
        mockUserData = {
            name: 'Mario',
            surname: 'Rossi',
            email: 'mario.rossi@example.com',
            password: 'Password123!',
            role: 'user'
        };

        // User mock dal database
        mockUser = {
            user_id: 1,
            name: 'Mario',
            surname: 'Rossi',
            email: 'mario.rossi@example.com',
            password_hash: '$2a$12$hashedpassword',
            role: 'user',
            created_at: '2025-01-01T00:00:00.000Z',
            is_password_reset_required: false,
            temp_password_hash: null,
            temp_password_expires_at: null,
            fcm_token: null
        };
    });

    describe('constructor', () => {
        it('should create user instance with correct properties', () => {
            const user = new User(mockUser);

            expect(user.user_id).toBe(1);
            expect(user.name).toBe('Mario');
            expect(user.surname).toBe('Rossi');
            expect(user.email).toBe('mario.rossi@example.com');
            expect(user.role).toBe('user');
            expect(user.is_password_reset_required).toBe(false);
        });

        it('should handle missing optional fields', () => {
            const minimalData = {
                user_id: 1,
                name: 'Mario',
                surname: 'Rossi',
                email: 'mario.rossi@example.com',
                role: 'user'
            };

            const user = new User(minimalData);

            expect(user.user_id).toBe(1);
            expect(user.is_password_reset_required).toBe(false);
        });
    });

    describe('create', () => {
        beforeEach(() => {
            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('$2a$12$hashedpassword');
        });

        it('should create new user successfully', async () => {
            // Mock per verifica email esistente (findByEmail)
            pool.query.mockResolvedValueOnce({ rows: [] }); // findByEmail returns null
            
            // Mock per inserimento utente
            pool.query.mockResolvedValueOnce({
                rows: [{
                    user_id: 1,
                    name: 'Mario',
                    surname: 'Rossi',
                    email: 'mario.rossi@example.com',
                    role: 'user',
                    created_at: '2025-01-01T00:00:00.000Z'
                }]
            });

            const result = await User.create(mockUserData);

            expect(result).toBeInstanceOf(User);
            expect(result.name).toBe('Mario');
            expect(result.email).toBe('mario.rossi@example.com');
            
            expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
            expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 'salt');
        });

        it('should throw error for duplicate email', async () => {
            // Mock per email esistente
            pool.query.mockResolvedValueOnce({ rows: [mockUser] });

            await expect(User.create(mockUserData)).rejects.toThrow('Email già registrata');
            
            expect(bcrypt.genSalt).not.toHaveBeenCalled();
            expect(bcrypt.hash).not.toHaveBeenCalled();
        });

        it('should validate required fields', async () => {
            const invalidData = {
                name: '',
                surname: 'Rossi',
                email: 'invalid-email',
                password: '123',
                role: 'invalid'
            };

            await expect(User.create(invalidData)).rejects.toThrow(AppError);
        });

        it('should handle database errors', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] }); // findByEmail
            pool.query.mockRejectedValueOnce(new Error('Database connection failed'));

            await expect(User.create(mockUserData)).rejects.toThrow('Errore durante la creazione dell\'utente');
        });
    });

    describe('findById', () => {
        it('should return user by id', async () => {
            pool.query.mockResolvedValue({ rows: [mockUser] });

            const result = await User.findById(1);

            expect(result).toBeInstanceOf(User);
            expect(result.user_id).toBe(1);
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                [1]
            );
        });

        it('should return null for non-existent user', async () => {
            pool.query.mockResolvedValue({ rows: [] });

            const result = await User.findById(999);

            expect(result).toBeNull();
        });

        it('should handle database errors', async () => {
            pool.query.mockRejectedValue(new Error('Database error'));

            await expect(User.findById(1)).rejects.toThrow('Errore durante la ricerca utente per ID');
        });
    });

    describe('findByEmail', () => {
        it('should return user by email', async () => {
            pool.query.mockResolvedValue({ rows: [mockUser] });

            const result = await User.findByEmail('mario.rossi@example.com');

            expect(result).toBeInstanceOf(User);
            expect(result.email).toBe('mario.rossi@example.com');
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                ['mario.rossi@example.com']
            );
        });

        it('should return null for non-existent email', async () => {
            pool.query.mockResolvedValue({ rows: [] });

            const result = await User.findByEmail('nonexistent@example.com');

            expect(result).toBeNull();
        });

        it('should handle database errors', async () => {
            pool.query.mockRejectedValue(new Error('Database error'));

            await expect(User.findByEmail('test@example.com')).rejects.toThrow();
        });
    });

    describe('searchByEmail', () => {
        it('should search users by email pattern with default limit', async () => {
            const mockUsers = [
                { user_id: 1, name: 'Mario', surname: 'Rossi', email: 'mario@example.com', role: 'customer', created_at: '2023-01-01' },
                { user_id: 2, name: 'Maria', surname: 'Bianchi', email: 'mario2@example.com', role: 'customer', created_at: '2023-01-02' }
            ];

            pool.query.mockResolvedValueOnce({
                rows: mockUsers
            });

            const result = await User.searchByEmail('mario');

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                id: 1,
                name: 'Mario',
                surname: 'Rossi',
                email: 'mario@example.com',
                role: 'customer',
                created_at: '2023-01-01'
            });
            expect(result[1]).toEqual({
                id: 2,
                name: 'Maria',
                surname: 'Bianchi',
                email: 'mario2@example.com',
                role: 'customer',
                created_at: '2023-01-02'
            });
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('LIKE LOWER'),
                ['%mario%', 10]
            );
        });

        it('should apply custom limit', async () => {
            pool.query.mockResolvedValue({ rows: [mockUser] });

            await User.searchByEmail('mario', 5);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('LIMIT'),
                ['%mario%', 5]
            );
        });

        it('should handle database errors', async () => {
            pool.query.mockRejectedValue(new Error('Database error'));

            await expect(User.searchByEmail('test')).rejects.toThrow();
        });
    });

    describe('updateFcmToken', () => {
        it('should update FCM token successfully', async () => {
            const userInstance = new User(mockUser);
            userInstance.fcm_token = 'new_token';
            
            pool.query.mockResolvedValue({ 
                rows: [{ user_id: mockUser.user_id, fcm_token: 'new_token' }] 
            });

            const result = await User.updateFcmToken(userInstance);

            expect(result).toEqual({
                user_id: mockUser.user_id,
                fcm_token: 'new_token'
            });
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE users SET fcm_token'),
                ['new_token', mockUser.user_id]
            );
        });

        it('should handle null token (logout)', async () => {
            const userInstance = new User(mockUser);
            userInstance.fcm_token = null;
            
            pool.query.mockResolvedValue({ 
                rows: [{ user_id: mockUser.user_id, fcm_token: null }] 
            });

            const result = await User.updateFcmToken(userInstance);

            expect(result).toEqual({
                user_id: mockUser.user_id,
                fcm_token: null
            });
            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE users SET fcm_token'),
                [null, mockUser.user_id]
            );
        });

        it('should handle database errors', async () => {
            const userInstance = new User(mockUser);
            pool.query.mockRejectedValue(new Error('Database error'));

            await expect(User.updateFcmToken(userInstance)).rejects.toThrow();
        });
    });

    describe('validateUserData', () => {
        it('should validate correct user data', () => {
            expect(() => {
                User.validateUserData(mockUserData);
            }).not.toThrow();
        });

        it('should throw error for missing required fields', () => {
            expect(() => {
                User.validateUserData({ name: 'Mario' });
            }).toThrow('Dati non validi');
        });

        it('should throw error for empty required fields', () => {
            expect(() => {
                User.validateUserData({ ...mockUserData, name: '' });
            }).toThrow('Dati non validi');
        });

        it('should throw error for invalid email format', () => {
            expect(() => {
                User.validateUserData({ ...mockUserData, email: 'invalid-email' });
            }).toThrow('Formato email non valido');
        });

        it('should throw error for short password', () => {
            expect(() => {
                User.validateUserData({ ...mockUserData, password: '123' });
            }).toThrow('Password deve essere di almeno 8 caratteri');
        });

        it('should throw error for invalid role', () => {
            expect(() => {
                User.validateUserData({ ...mockUserData, role: 'invalid' });
            }).toThrow('Dati non validi');
        });
    });

    describe('validateEmail', () => {
        it('should validate correct email formats', () => {
            const validEmails = [
                'test@example.com',
                'user.name@domain.co.uk',
                'user+tag@example.org',
                'test123@test-domain.com'
            ];

            validEmails.forEach(email => {
                expect(() => {
                    User.validateEmail(email);
                }).not.toThrow();
            });
        });

        it('should reject invalid email formats', () => {
            const invalidEmails = [
                'invalid-email',
                '@example.com',
                'test@',
                'test@@example.com',
                'test .space@example.com'
            ];

            invalidEmails.forEach(email => {
                expect(() => {
                    User.validateEmail(email);
                }).toThrow('Formato email non valido');
            });
        });
    });

    describe('validatePassword', () => {
        it('should validate correct passwords', () => {
            const validPasswords = [
                'Password123',  // 11 caratteri
                'MyPassword1',  // 11 caratteri  
                'ValidPass1',   // 10 caratteri
                'SecurePa1'     // 9 caratteri
            ];

            validPasswords.forEach(password => {
                expect(() => {
                    User.validatePassword(password);
                }).not.toThrow();
            });
        });

        it('should reject passwords without uppercase', () => {
            expect(() => {
                User.validatePassword('password123');
            }).toThrow('Password deve contenere almeno una maiuscola, una minuscola e un numero');
        });

        it('should reject passwords without lowercase', () => {
            expect(() => {
                User.validatePassword('PASSWORD123');
            }).toThrow('Password deve contenere almeno una maiuscola, una minuscola e un numero');
        });

        it('should reject passwords without numbers', () => {
            expect(() => {
                User.validatePassword('Password');
            }).toThrow('Password deve contenere almeno una maiuscola, una minuscola e un numero');
        });

        it('should reject short passwords', () => {
            const shortPasswords = ['123', 'abc', '1234567'];

            shortPasswords.forEach(password => {
                expect(() => {
                    User.validatePassword(password);
                }).toThrow('Password deve essere di almeno 8 caratteri');
            });
        });

        it('should handle empty password', () => {
            expect(() => {
                User.validatePassword('');
            }).toThrow('Password deve essere di almeno 8 caratteri');
        });
    });
});
