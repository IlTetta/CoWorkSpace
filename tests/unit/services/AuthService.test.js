const jwt = require('jsonwebtoken');
const AuthService = require('../../../src/backend/services/AuthService');
const User = require('../../../src/backend/models/User');
const AppError = require('../../../src/backend/utils/AppError');

// Mock delle dipendenze
jest.mock('../../../src/backend/models/User');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
    let mockUser;
    let mockToken;
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup mock user
        mockUser = {
            user_id: 1,
            email: 'test@example.com',
            role: 'user',
            password: 'hashedPassword123',
            toJSON: () => ({
                user_id: 1,
                email: 'test@example.com',
                role: 'user'
            }),
            verifyPasswordForLogin: jest.fn(),
            changePassword: jest.fn(),
            updateProfile: jest.fn(),
            generateTemporaryPassword: jest.fn(),
            requirePasswordReset: jest.fn(),
            changePasswordOnReset: jest.fn(),
            hasAnyRole: jest.fn(),
            hasRole: jest.fn()
        };

        // Setup mock token
        mockToken = 'mock.jwt.token';
        jwt.sign.mockReturnValue(mockToken);
    });

    describe('register', () => {
        const userData = {
            email: 'test@example.com',
            password: 'Password123!',
            firstName: 'Test',
            lastName: 'User'
        };

        it('should register new user and return token', async () => {
            User.create.mockResolvedValue(mockUser);

            const result = await AuthService.register(userData);

            expect(User.create).toHaveBeenCalledWith(userData);
            expect(result).toEqual({
                token: mockToken,
                user: mockUser.toJSON(),
                canLogin: true
            });
        });
    });

    describe('login', () => {
        it('should login user with correct credentials', async () => {
            User.findByEmail.mockResolvedValue(mockUser);
            mockUser.verifyPasswordForLogin.mockResolvedValue({ isValid: true, requiresReset: false });

            const result = await AuthService.login('test@example.com', 'password123');

            expect(result).toEqual({
                token: mockToken,
                user: mockUser.toJSON(),
                requiresPasswordReset: false
            });
        });

        it('should throw error for invalid credentials', async () => {
            User.findByEmail.mockResolvedValue(mockUser);
            mockUser.verifyPasswordForLogin.mockResolvedValue({ isValid: false });

            await expect(
                AuthService.login('test@example.com', 'wrongpassword')
            ).rejects.toThrow('Email o password non corretti');
        });

        it('should throw error for non-existent user', async () => {
            User.findByEmail.mockResolvedValue(null);

            await expect(
                AuthService.login('nonexistent@example.com', 'password123')
            ).rejects.toThrow('Email o password non corretti');
        });

        it('should indicate when password reset is required', async () => {
            User.findByEmail.mockResolvedValue(mockUser);
            mockUser.verifyPasswordForLogin.mockResolvedValue({ isValid: true, requiresReset: true });

            const result = await AuthService.login('test@example.com', 'password123');

            expect(result.requiresPasswordReset).toBe(true);
        });
    });

    describe('verifyToken', () => {
        it('should verify valid token and return user', async () => {
            jwt.verify.mockReturnValue({ id: 1 });
            User.findById.mockResolvedValue(mockUser);

            const result = await AuthService.verifyToken(mockToken);

            expect(result).toEqual(mockUser);
        });

        it('should throw error for invalid token', async () => {
            jwt.verify.mockImplementation(() => {
                throw { name: 'JsonWebTokenError' };
            });

            await expect(
                AuthService.verifyToken('invalid.token')
            ).rejects.toThrow('Token di accesso non valido');
        });

        it('should throw error for expired token', async () => {
            jwt.verify.mockImplementation(() => {
                throw { name: 'TokenExpiredError' };
            });

            await expect(
                AuthService.verifyToken('expired.token')
            ).rejects.toThrow('Token di accesso scaduto');
        });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            mockUser.changePassword.mockResolvedValue(true);

            const result = await AuthService.changePassword(
                mockUser,
                'oldPassword',
                'newPassword'
            );

            expect(result).toBe(true);
            expect(mockUser.changePassword).toHaveBeenCalledWith(
                'oldPassword',
                'newPassword'
            );
        });
    });

    describe('requestPasswordReset', () => {
        it('should generate temporary password for valid email', async () => {
            User.findByEmail.mockResolvedValue(mockUser);
            mockUser.generateTemporaryPassword.mockResolvedValue('temp123');

            const result = await AuthService.requestPasswordReset('test@example.com');

            expect(result).toEqual({
                success: true,
                user: mockUser.toJSON(),
                tempPassword: 'temp123',
                message: expect.any(String)
            });
        });

        it('should not reveal if email exists', async () => {
            User.findByEmail.mockResolvedValue(null);

            const result = await AuthService.requestPasswordReset('nonexistent@example.com');

            expect(result.success).toBe(true);
            expect(result.message).toContain('Se l\'email è registrata');
        });
    });

    describe('middleware', () => {
        let req;
        let res;
        let next;

        beforeEach(() => {
            req = {
                headers: {},
                cookies: {},
                params: {}
            };
            res = {};
            next = jest.fn();
        });

        describe('authenticate', () => {
            it('should authenticate valid token', async () => {
                req.headers.authorization = 'Bearer validtoken';
                jwt.verify.mockReturnValue({ id: 1 });
                User.findById.mockResolvedValue(mockUser);

                await AuthService.authenticate(req, res, next);

                expect(req.user).toBe(mockUser);
                expect(next).toHaveBeenCalledWith();
            });

            it('should handle missing token', async () => {
                await AuthService.authenticate(req, res, next);

                expect(next).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'Token di accesso mancante'
                    })
                );
            });
        });

        describe('authorize', () => {
            it('should authorize user with correct role', () => {
                req.user = mockUser;
                mockUser.hasAnyRole.mockReturnValue(true);

                const middleware = AuthService.authorize('user', 'admin');
                middleware(req, res, next);

                expect(next).toHaveBeenCalledWith();
            });

            it('should reject user with wrong role', () => {
                req.user = mockUser;
                mockUser.hasAnyRole.mockReturnValue(false);

                const middleware = AuthService.authorize('admin');
                middleware(req, res, next);

                expect(next).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'Non hai il permesso per accedere a questa risorsa'
                    })
                );
            });
        });

        describe('restrictToOwner', () => {
            it('should allow owner to access resource', () => {
                req.user = mockUser;
                req.params.userId = '1';
                mockUser.hasRole.mockReturnValue(false);

                const middleware = AuthService.restrictToOwner('userId');
                middleware(req, res, next);

                expect(next).toHaveBeenCalledWith();
            });

            it('should allow admin to access any resource', () => {
                req.user = mockUser;
                req.params.userId = '2';
                mockUser.hasRole.mockReturnValue(true); // is admin

                const middleware = AuthService.restrictToOwner('userId');
                middleware(req, res, next);

                expect(next).toHaveBeenCalledWith();
            });

            it('should reject non-owner access', () => {
                req.user = mockUser;
                req.params.userId = '2';
                mockUser.hasRole.mockReturnValue(false);

                const middleware = AuthService.restrictToOwner('userId');
                middleware(req, res, next);

                expect(next).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'Non puoi accedere a risorse di altri utenti'
                    })
                );
            });
        });
    });

    describe('searchUsersByEmail', () => {
        it('should search users by email pattern', async () => {
            const users = [mockUser];
            User.searchByEmail.mockResolvedValue(users);

            const result = await AuthService.searchUsersByEmail('test@');

            expect(User.searchByEmail).toHaveBeenCalledWith('test@', 10);
            expect(result).toEqual(users);
        });

        it('should require minimum pattern length', async () => {
            await expect(
                AuthService.searchUsersByEmail('t')
            ).rejects.toThrow('Pattern email deve contenere almeno 3 caratteri');
        });
    });

    describe('updateFcmToken', () => {
        it('should update FCM token for user', async () => {
            User.findById.mockResolvedValue(mockUser);
            User.updateFcmToken.mockResolvedValue(mockUser);

            const result = await AuthService.updateFcmToken(1, 'new-fcm-token');

            expect(User.updateFcmToken).toHaveBeenCalled();
            expect(result).toBe(mockUser);
        });

        it('should require both userId and token', async () => {
            await expect(
                AuthService.updateFcmToken(1, null)
            ).rejects.toThrow('ID utente e token FCM sono obbligatori');
        });
    });
});
