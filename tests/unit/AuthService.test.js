const AuthService = require('../../src/backend/services/AuthService');
const User = require('../../src/backend/models/User');
const AppError = require('../../src/backend/utils/AppError');
const jwt = require('jsonwebtoken');

// Mock del modello User
jest.mock('../../src/backend/models/User');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  // Setup per ogni test
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '24h';
  });

  describe('generateToken', () => {
    it('dovrebbe generare un token JWT valido', () => {
      // Arrange
      const mockUser = {
        user_id: 1,
        role: 'user',
        email: 'test@example.com'
      };
      
      const expectedToken = 'mock-jwt-token';
      jwt.sign.mockReturnValue(expectedToken);

      // Act
      const token = AuthService.generateToken(mockUser);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: mockUser.user_id,
          role: mockUser.role,
          email: mockUser.email
        },
        'test-secret',
        {
          expiresIn: '24h',
          issuer: 'coworkspace-api',
          audience: 'coworkspace-users'
        }
      );
      expect(token).toBe(expectedToken);
    });

    it('dovrebbe usare le variabili di ambiente corrette', () => {
      // Arrange
      process.env.JWT_EXPIRES_IN = '48h';
      const mockUser = {
        user_id: 2,
        role: 'manager',
        email: 'manager@example.com'
      };

      // Act
      AuthService.generateToken(mockUser);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        'test-secret',
        expect.objectContaining({
          expiresIn: '48h'
        })
      );
    });
  });

  describe('extractTokenFromRequest', () => {
    it('dovrebbe estrarre il token dall\'header Authorization Bearer', () => {
      // Arrange
      const req = {
        headers: {
          authorization: 'Bearer test-token-123'
        }
      };

      // Act
      const token = AuthService.extractTokenFromRequest(req);

      // Assert
      expect(token).toBe('test-token-123');
    });

    it('dovrebbe estrarre il token dai cookies', () => {
      // Arrange
      const req = {
        headers: {},
        cookies: {
          jwt: 'cookie-token-456'
        }
      };

      // Act
      const token = AuthService.extractTokenFromRequest(req);

      // Assert
      expect(token).toBe('cookie-token-456');
    });

    it('dovrebbe preferire l\'header Authorization rispetto ai cookies', () => {
      // Arrange
      const req = {
        headers: {
          authorization: 'Bearer header-token'
        },
        cookies: {
          jwt: 'cookie-token'
        }
      };

      // Act
      const token = AuthService.extractTokenFromRequest(req);

      // Assert
      expect(token).toBe('header-token');
    });

    it('dovrebbe restituire null se non c\'è nessun token', () => {
      // Arrange
      const req = {
        headers: {}
      };

      // Act
      const token = AuthService.extractTokenFromRequest(req);

      // Assert
      expect(token).toBeNull();
    });

    it('dovrebbe restituire null se l\'header Authorization non ha il formato Bearer', () => {
      // Arrange
      const req = {
        headers: {
          authorization: 'Basic dGVzdDp0ZXN0'
        }
      };

      // Act
      const token = AuthService.extractTokenFromRequest(req);

      // Assert
      expect(token).toBeNull();
    });
  });

  describe('checkEmailExists', () => {
    it('dovrebbe restituire true se l\'email esiste', async () => {
      // Arrange
      const email = 'existing@example.com';
      const mockUser = { user_id: 1, email };
      
      User.validateEmail = jest.fn();
      User.findByEmail.mockResolvedValue(mockUser);

      // Act
      const exists = await AuthService.checkEmailExists(email);

      // Assert
      expect(User.validateEmail).toHaveBeenCalledWith(email);
      expect(User.findByEmail).toHaveBeenCalledWith(email);
      expect(exists).toBe(true);
    });

    it('dovrebbe restituire false se l\'email non esiste', async () => {
      // Arrange
      const email = 'nonexisting@example.com';
      
      User.validateEmail = jest.fn();
      User.findByEmail.mockResolvedValue(null);

      // Act
      const exists = await AuthService.checkEmailExists(email);

      // Assert
      expect(User.validateEmail).toHaveBeenCalledWith(email);
      expect(User.findByEmail).toHaveBeenCalledWith(email);
      expect(exists).toBe(false);
    });

    it('dovrebbe lanciare un errore se l\'email non è fornita', async () => {
      // Act & Assert
      await expect(AuthService.checkEmailExists()).rejects.toThrow(AppError);
      await expect(AuthService.checkEmailExists('')).rejects.toThrow(AppError);
    });

    it('dovrebbe validare il formato email', async () => {
      // Arrange
      const email = 'invalid-email';
      User.validateEmail = jest.fn().mockImplementation(() => {
        throw AppError.badRequest('Formato email non valido');
      });

      // Act & Assert
      await expect(AuthService.checkEmailExists(email)).rejects.toThrow(AppError);
      expect(User.validateEmail).toHaveBeenCalledWith(email);
    });
  });

  describe('generateRefreshToken', () => {
    it('dovrebbe generare un refresh token con scadenza di 7 giorni', () => {
      // Arrange
      const mockUser = {
        user_id: 1,
      };
      
      const expectedToken = 'mock-refresh-token';
      jwt.sign.mockReturnValue(expectedToken);

      // Act
      const token = AuthService.generateRefreshToken(mockUser);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: mockUser.user_id,
          type: 'refresh'
        },
        'test-secret', // Fallback a JWT_SECRET se JWT_REFRESH_SECRET non è definito
        {
          expiresIn: '7d',
          issuer: 'coworkspace-api',
          audience: 'coworkspace-refresh'
        }
      );
      expect(token).toBe(expectedToken);
    });

    it('dovrebbe usare JWT_REFRESH_SECRET se disponibile', () => {
      // Arrange
      process.env.JWT_REFRESH_SECRET = 'refresh-secret';
      const mockUser = { user_id: 1 };

      // Act
      AuthService.generateRefreshToken(mockUser);

      // Assert
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        'refresh-secret',
        expect.any(Object)
      );
    });
  });

  describe('verifyToken', () => {
    it('dovrebbe verificare e restituire l\'utente per un token valido', async () => {
      // Arrange
      const token = 'valid-token';
      const decodedPayload = { id: 1, role: 'user', email: 'test@example.com' };
      const mockUser = {
        user_id: 1,
        role: 'user',
        email: 'test@example.com',
        toJSON: jest.fn().mockReturnValue({ user_id: 1, email: 'test@example.com' })
      };

      jwt.verify.mockReturnValue(decodedPayload);
      User.findById.mockResolvedValue(mockUser);

      // Act
      const result = await AuthService.verifyToken(token);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret');
      expect(User.findById).toHaveBeenCalledWith(1);
      expect(result).toBe(mockUser);
    });

    it('dovrebbe lanciare errore se il token è invalido', async () => {
      // Arrange
      const token = 'invalid-token';
      jwt.verify.mockImplementation(() => {
        const error = new Error('invalid signature');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      // Act & Assert
      await expect(AuthService.verifyToken(token)).rejects.toThrow(AppError);
    });

    it('dovrebbe lanciare errore se il token è scaduto', async () => {
      // Arrange
      const token = 'expired-token';
      jwt.verify.mockImplementation(() => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      // Act & Assert
      await expect(AuthService.verifyToken(token)).rejects.toThrow(AppError);
    });

    it('dovrebbe lanciare errore se l\'utente non esiste più', async () => {
      // Arrange
      const token = 'valid-token';
      const decodedPayload = { id: 999 };

      jwt.verify.mockReturnValue(decodedPayload);
      User.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(AuthService.verifyToken(token)).rejects.toThrow(AppError);
      expect(User.findById).toHaveBeenCalledWith(999);
    });
  });

  describe('login', () => {
    it('dovrebbe effettuare login con credenziali valide', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';
      const mockUser = {
        user_id: 1,
        email,
        role: 'user',
        verifyPasswordForLogin: jest.fn().mockResolvedValue({
          isValid: true,
          requiresReset: false
        }),
        toJSON: jest.fn().mockReturnValue({ user_id: 1, email })
      };

      User.findByEmail.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('generated-token');

      // Act
      const result = await AuthService.login(email, password);

      // Assert
      expect(User.findByEmail).toHaveBeenCalledWith(email);
      expect(mockUser.verifyPasswordForLogin).toHaveBeenCalledWith(password);
      expect(result).toEqual({
        token: 'generated-token',
        user: { user_id: 1, email },
        requiresPasswordReset: false
      });
    });

    it('dovrebbe lanciare errore se email o password mancano', async () => {
      // Act & Assert
      await expect(AuthService.login('', 'password')).rejects.toThrow(AppError);
      await expect(AuthService.login('email@test.com', '')).rejects.toThrow(AppError);
      await expect(AuthService.login()).rejects.toThrow(AppError);
    });

    it('dovrebbe lanciare errore se l\'utente non esiste', async () => {
      // Arrange
      User.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(AuthService.login('nonexistent@example.com', 'password')).rejects.toThrow(AppError);
    });

    it('dovrebbe lanciare errore se la password è sbagliata', async () => {
      // Arrange
      const mockUser = {
        verifyPasswordForLogin: jest.fn().mockResolvedValue({
          isValid: false
        })
      };

      User.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(AuthService.login('test@example.com', 'wrong-password')).rejects.toThrow(AppError);
    });

    it('dovrebbe lanciare errore specifico se manager request è pending', async () => {
      // Arrange
      const mockUser = {
        verifyPasswordForLogin: jest.fn().mockResolvedValue({
          isValid: false,
          managerRequestPending: true,
          message: 'Richiesta manager in attesa di approvazione'
        })
      };

      User.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(AuthService.login('test@example.com', 'password')).rejects.toThrow(AppError);
    });

    it('dovrebbe restituire requiresPasswordReset se la password temporanea è valida', async () => {
      // Arrange
      const mockUser = {
        user_id: 1,
        email: 'test@example.com',
        verifyPasswordForLogin: jest.fn().mockResolvedValue({
          isValid: true,
          requiresReset: true
        }),
        toJSON: jest.fn().mockReturnValue({ user_id: 1, email: 'test@example.com' })
      };

      User.findByEmail.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('generated-token');

      // Act
      const result = await AuthService.login('test@example.com', 'temp-password');

      // Assert
      expect(result.requiresPasswordReset).toBe(true);
    });
  });
});
