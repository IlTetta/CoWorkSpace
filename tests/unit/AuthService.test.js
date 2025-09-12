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

  describe('register', () => {
    it('dovrebbe registrare un utente normale con successo', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        name: 'Test',
        surname: 'User',
        password: 'password123'
      };

      const mockUser = {
        user_id: 1,
        email: 'test@example.com',
        name: 'Test',
        surname: 'User',
        role: 'user',
        manager_request_pending: false,
        toJSON: jest.fn().mockReturnValue({
          user_id: 1,
          email: 'test@example.com',
          name: 'Test',
          surname: 'User',
          role: 'user'
        })
      };

      User.create.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mock-jwt-token');

      // Act
      const result = await AuthService.register(userData);

      // Assert
      expect(User.create).toHaveBeenCalledWith(userData);
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: 1,
          role: 'user',
          email: 'test@example.com'
        },
        'test-secret',
        {
          expiresIn: '24h',
          issuer: 'coworkspace-api',
          audience: 'coworkspace-users'
        }
      );
      expect(result).toEqual({
        token: 'mock-jwt-token',
        user: mockUser.toJSON(),
        canLogin: true
      });
    });

    it('dovrebbe registrare un utente con richiesta manager senza token', async () => {
      // Arrange
      const userData = {
        email: 'manager@example.com',
        name: 'Manager',
        surname: 'User',
        password: 'password123',
        requestManager: true
      };

      const mockUser = {
        user_id: 2,
        email: 'manager@example.com',
        name: 'Manager',
        surname: 'User',
        role: 'user',
        manager_request_pending: true,
        toJSON: jest.fn().mockReturnValue({
          user_id: 2,
          email: 'manager@example.com',
          name: 'Manager',
          surname: 'User',
          role: 'user',
          manager_request_pending: true
        })
      };

      User.create.mockResolvedValue(mockUser);

      // Act
      const result = await AuthService.register(userData);

      // Assert
      expect(User.create).toHaveBeenCalledWith(userData);
      expect(jwt.sign).not.toHaveBeenCalled();
      expect(result).toEqual({
        token: null,
        user: mockUser.toJSON(),
        message: 'Registrazione completata. La tua richiesta per diventare manager è stata inviata all\'amministratore. Non potrai effettuare il login fino all\'approvazione.',
        canLogin: false
      });
    });
  });

  describe('requestPasswordReset', () => {
    it('dovrebbe generare password temporanea per utente esistente', async () => {
      // Arrange
      const email = 'test@example.com';
      const mockUser = {
        user_id: 1,
        email,
        generateTemporaryPassword: jest.fn().mockResolvedValue('temp123'),
        toJSON: jest.fn().mockReturnValue({ user_id: 1, email })
      };

      User.findByEmail.mockResolvedValue(mockUser);

      // Act
      const result = await AuthService.requestPasswordReset(email);

      // Assert
      expect(User.findByEmail).toHaveBeenCalledWith(email);
      expect(mockUser.generateTemporaryPassword).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        user: { user_id: 1, email },
        tempPassword: 'temp123',
        message: 'Password temporanea generata con successo'
      });
    });

    it('dovrebbe restituire messaggio generico per utente non esistente', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      User.findByEmail.mockResolvedValue(null);

      // Act
      const result = await AuthService.requestPasswordReset(email);

      // Assert
      expect(User.findByEmail).toHaveBeenCalledWith(email);
      expect(result).toEqual({
        success: true,
        message: 'Se l\'email è registrata, riceverai le istruzioni per il reset'
      });
    });

    it('dovrebbe lanciare errore se email non è fornita', async () => {
      // Act & Assert
      await expect(AuthService.requestPasswordReset()).rejects.toThrow(AppError);
      await expect(AuthService.requestPasswordReset('')).rejects.toThrow(AppError);
    });
  });

  describe('changePassword', () => {
    it('dovrebbe cambiare password con successo', async () => {
      // Arrange
      const mockUser = {
        user_id: 1,
        changePassword: jest.fn().mockResolvedValue(true)
      };
      const currentPassword = 'oldpassword';
      const newPassword = 'newpassword';

      // Act
      const result = await AuthService.changePassword(mockUser, currentPassword, newPassword);

      // Assert
      expect(mockUser.changePassword).toHaveBeenCalledWith(currentPassword, newPassword);
      expect(result).toBe(true);
    });
  });

  describe('updateProfile', () => {
    it('dovrebbe aggiornare profilo utente', async () => {
      // Arrange
      const mockUser = {
        user_id: 1,
        updateProfile: jest.fn().mockResolvedValue({ user_id: 1, name: 'Updated Name' })
      };
      const updateData = { name: 'Updated Name' };

      // Act
      const result = await AuthService.updateProfile(mockUser, updateData);

      // Assert
      expect(mockUser.updateProfile).toHaveBeenCalledWith(updateData);
      expect(result).toEqual({ user_id: 1, name: 'Updated Name' });
    });
  });

  describe('searchUsersByEmail', () => {
    it('dovrebbe cercare utenti per pattern email', async () => {
      // Arrange
      const emailPattern = 'test';
      const mockUsers = [
        { user_id: 1, email: 'test1@example.com' },
        { user_id: 2, email: 'test2@example.com' }
      ];

      User.searchByEmail.mockResolvedValue(mockUsers);

      // Act
      const result = await AuthService.searchUsersByEmail(emailPattern);

      // Assert
      expect(User.searchByEmail).toHaveBeenCalledWith(emailPattern, 10);
      expect(result).toEqual(mockUsers);
    });

    it('dovrebbe accettare limit personalizzato', async () => {
      // Arrange
      const emailPattern = 'test';
      const limit = 5;
      User.searchByEmail.mockResolvedValue([]);

      // Act
      await AuthService.searchUsersByEmail(emailPattern, limit);

      // Assert
      expect(User.searchByEmail).toHaveBeenCalledWith(emailPattern, limit);
    });

    it('dovrebbe lanciare errore se pattern è troppo corto', async () => {
      // Act & Assert
      await expect(AuthService.searchUsersByEmail('te')).rejects.toThrow(AppError);
      await expect(AuthService.searchUsersByEmail('')).rejects.toThrow(AppError);
      await expect(AuthService.searchUsersByEmail()).rejects.toThrow(AppError);
    });
  });

  describe('updateFcmToken', () => {
    it('dovrebbe aggiornare FCM token per utente esistente', async () => {
      // Arrange
      const userId = 1;
      const fcmToken = 'fcm-token-123';
      const mockUser = {
        user_id: 1,
        email: 'test@example.com'
      };

      User.findById.mockResolvedValue(mockUser);
      User.updateFcmToken.mockResolvedValue(mockUser);

      // Act
      const result = await AuthService.updateFcmToken(userId, fcmToken);

      // Assert
      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(mockUser.fcm_token).toBe(fcmToken);
      expect(User.updateFcmToken).toHaveBeenCalledWith(mockUser);
      expect(result).toBe(mockUser);
    });

    it('dovrebbe lanciare errore se utente non trovato', async () => {
      // Arrange
      User.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(AuthService.updateFcmToken(1, 'token')).rejects.toThrow(AppError);
    });

    it('dovrebbe lanciare errore se parametri mancanti', async () => {
      // Act & Assert
      await expect(AuthService.updateFcmToken()).rejects.toThrow(AppError);
      await expect(AuthService.updateFcmToken(1)).rejects.toThrow(AppError);
      await expect(AuthService.updateFcmToken(null, 'token')).rejects.toThrow(AppError);
    });
  });

  describe('getUserById', () => {
    it('dovrebbe restituire utente per ID valido', async () => {
      // Arrange
      const userId = 1;
      const mockUser = { user_id: 1, email: 'test@example.com' };
      User.findById.mockResolvedValue(mockUser);

      // Act
      const result = await AuthService.getUserById(userId);

      // Assert
      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(result).toBe(mockUser);
    });

    it('dovrebbe restituire null per utente non esistente', async () => {
      // Arrange
      User.findById.mockResolvedValue(null);

      // Act
      const result = await AuthService.getUserById(999);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('dovrebbe completare logout con successo', async () => {
      // Act
      const result = await AuthService.logout('some-token');

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('getAllUsers', () => {
    beforeEach(() => {
      User.query = jest.fn();
    });

    it('dovrebbe restituire tutti gli utenti senza filtri', async () => {
      // Arrange
      const mockUsers = [
        { user_id: 1, email: 'user1@example.com', role: 'user' },
        { user_id: 2, email: 'user2@example.com', role: 'manager' }
      ];
      User.getAllUsers.mockResolvedValue(mockUsers);

      // Act
      const result = await AuthService.getAllUsers();

      // Assert
      expect(User.getAllUsers).toHaveBeenCalledWith({});
      expect(result).toEqual(mockUsers);
    });

    it('dovrebbe filtrare per ruolo', async () => {
      // Arrange
      User.getAllUsers.mockResolvedValue([]);

      // Act
      await AuthService.getAllUsers({ role: 'manager' });

      // Assert
      expect(User.getAllUsers).toHaveBeenCalledWith({ role: 'manager' });
    });

    it('dovrebbe filtrare per email', async () => {
      // Arrange
      User.getAllUsers.mockResolvedValue([]);

      // Act
      await AuthService.getAllUsers({ email: 'test' });

      // Assert
      expect(User.getAllUsers).toHaveBeenCalledWith({ email: 'test' });
    });

    it('dovrebbe filtrare per nome', async () => {
      // Arrange
      User.getAllUsers.mockResolvedValue([]);

      // Act
      await AuthService.getAllUsers({ name: 'John' });

      // Assert
      expect(User.getAllUsers).toHaveBeenCalledWith({ name: 'John' });
    });

    it('dovrebbe ordinare per nome crescente', async () => {
      // Arrange
      User.getAllUsers.mockResolvedValue([]);

      // Act
      await AuthService.getAllUsers({ sort_by: 'name_asc' });

      // Assert
      expect(User.getAllUsers).toHaveBeenCalledWith({ sort_by: 'name_asc' });
    });

    it('dovrebbe limitare i risultati', async () => {
      // Arrange
      User.getAllUsers.mockResolvedValue([]);

      // Act
      await AuthService.getAllUsers({ limit: 10 });

      // Assert
      expect(User.getAllUsers).toHaveBeenCalledWith({ limit: 10 });
    });

    it('dovrebbe combinare più filtri', async () => {
      // Arrange
      User.getAllUsers.mockResolvedValue([]);

      // Act
      await AuthService.getAllUsers({
        role: 'user',
        email: 'test',
        sort_by: 'email_desc',
        limit: 5
      });

      // Assert
      expect(User.getAllUsers).toHaveBeenCalledWith({
        role: 'user',
        email: 'test',
        sort_by: 'email_desc',
        limit: 5
      });
    });
  });

  describe('updateUserRole', () => {
    beforeEach(() => {
      User.updateUserRole = jest.fn();
    });

    it('dovrebbe aggiornare ruolo utente se admin', async () => {
      // Arrange
      const adminUser = { role: 'admin' };
      const updatedUser = { user_id: 1, email: 'test@example.com', role: 'manager' };

      User.updateUserRole.mockResolvedValue(updatedUser);

      // Act
      const result = await AuthService.updateUserRole(1, 'manager', adminUser);

      // Assert
      expect(User.updateUserRole).toHaveBeenCalledWith(1, 'manager');
      expect(result).toEqual(updatedUser);
    });

    it('dovrebbe lanciare errore se non admin', async () => {
      // Arrange
      const managerUser = { role: 'manager' };

      // Act & Assert
      await expect(AuthService.updateUserRole(1, 'manager', managerUser))
        .rejects.toThrow('Solo gli admin possono modificare i ruoli');
    });

    it('dovrebbe lanciare errore se ruolo non valido', async () => {
      // Arrange
      const adminUser = { role: 'admin' };
      User.updateUserRole.mockRejectedValue(new AppError('Ruolo non valido', 400));

      // Act & Assert
      await expect(AuthService.updateUserRole(1, 'invalid', adminUser))
        .rejects.toThrow('Ruolo non valido');
    });

    it('dovrebbe lanciare errore se utente non trovato', async () => {
      // Arrange
      const adminUser = { role: 'admin' };
      User.updateUserRole.mockRejectedValue(new AppError('Utente non trovato', 404));

      // Act & Assert
      await expect(AuthService.updateUserRole(999, 'manager', adminUser))
        .rejects.toThrow('Utente non trovato');
    });
  });

  describe('getPendingManagerRequests', () => {
    it('dovrebbe restituire richieste pending se admin', async () => {
      // Arrange
      const adminUser = { role: 'admin' };
      const mockRequests = [
        { user_id: 1, email: 'test1@example.com', manager_request_pending: true },
        { user_id: 2, email: 'test2@example.com', manager_request_pending: true }
      ];

      User.getPendingManagerRequests.mockResolvedValue(mockRequests);

      // Act
      const result = await AuthService.getPendingManagerRequests(adminUser);

      // Assert
      expect(User.getPendingManagerRequests).toHaveBeenCalled();
      expect(result).toEqual(mockRequests);
    });

    it('dovrebbe lanciare errore se non admin', async () => {
      // Arrange
      const managerUser = { role: 'manager' };

      // Act & Assert
      await expect(AuthService.getPendingManagerRequests(managerUser))
        .rejects.toThrow('Solo gli admin possono visualizzare le richieste manager');
    });
  });

  describe('approveManagerRequest', () => {
    it('dovrebbe approvare richiesta manager se admin', async () => {
      // Arrange
      const adminUser = { role: 'admin' };
      const approvedUser = { user_id: 1, role: 'manager', manager_request_pending: false };

      User.approveManagerRequest.mockResolvedValue(approvedUser);

      // Act
      const result = await AuthService.approveManagerRequest(1, adminUser);

      // Assert
      expect(User.approveManagerRequest).toHaveBeenCalledWith(1);
      expect(result).toEqual(approvedUser);
    });

    it('dovrebbe lanciare errore se non admin', async () => {
      // Arrange
      const userRole = { role: 'user' };

      // Act & Assert
      await expect(AuthService.approveManagerRequest(1, userRole))
        .rejects.toThrow('Solo gli admin possono approvare le richieste manager');
    });
  });

  describe('rejectManagerRequest', () => {
    it('dovrebbe rifiutare richiesta manager se admin', async () => {
      // Arrange
      const adminUser = { role: 'admin' };
      const rejectedUser = { user_id: 1, role: 'user', manager_request_pending: false };

      User.rejectManagerRequest.mockResolvedValue(rejectedUser);

      // Act
      const result = await AuthService.rejectManagerRequest(1, adminUser);

      // Assert
      expect(User.rejectManagerRequest).toHaveBeenCalledWith(1);
      expect(result).toEqual(rejectedUser);
    });

    it('dovrebbe lanciare errore se non admin', async () => {
      // Arrange
      const managerUser = { role: 'manager' };

      // Act & Assert
      await expect(AuthService.rejectManagerRequest(1, managerUser))
        .rejects.toThrow('Solo gli admin possono rifiutare le richieste manager');
    });
  });

  describe('getUserDashboard', () => {
    it('dovrebbe restituire dashboard utente', async () => {
      // Arrange
      const userId = 1;
      const mockDashboard = {
        user: { user_id: 1, name: 'Test User' },
        bookings: [],
        notifications: []
      };

      User.getDashboard.mockResolvedValue(mockDashboard);

      // Act
      const result = await AuthService.getUserDashboard(userId);

      // Assert
      expect(User.getDashboard).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockDashboard);
    });
  });

  describe('getManagerDashboard', () => {
    it('dovrebbe restituire dashboard manager', async () => {
      // Arrange
      const managerId = 1;
      const mockDashboard = {
        manager: { user_id: 1, name: 'Test Manager' },
        spaces: [],
        bookings: [],
        revenue: 0
      };

      User.getManagerDashboard.mockResolvedValue(mockDashboard);

      // Act
      const result = await AuthService.getManagerDashboard(managerId);

      // Assert
      expect(User.getManagerDashboard).toHaveBeenCalledWith(managerId);
      expect(result).toEqual(mockDashboard);
    });
  });

  describe('initiatePasswordChange', () => {
    it('dovrebbe impostare flag reset password', async () => {
      // Arrange
      const mockUser = {
        user_id: 1,
        requirePasswordReset: jest.fn().mockResolvedValue(),
        toJSON: jest.fn().mockReturnValue({ user_id: 1, email: 'test@example.com' })
      };

      // Act
      const result = await AuthService.initiatePasswordChange(mockUser);

      // Assert
      expect(mockUser.requirePasswordReset).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        user: { user_id: 1, email: 'test@example.com' },
        message: 'Richiesta cambio password impostata. Verrai reindirizzato al cambio password'
      });
    });
  });

  describe('changePasswordOnReset', () => {
    it('dovrebbe cambiare password durante reset', async () => {
      // Arrange
      const mockUser = {
        changePasswordOnReset: jest.fn().mockResolvedValue(true)
      };

      // Act
      const result = await AuthService.changePasswordOnReset(mockUser, 'temppass', 'newpass');

      // Assert
      expect(mockUser.changePasswordOnReset).toHaveBeenCalledWith('temppass', 'newpass');
      expect(result).toBe(true);
    });
  });
});
