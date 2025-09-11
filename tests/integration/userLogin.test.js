const request = require('supertest');
const { createTestApp } = require('../helpers/testApp');
const AuthService = require('../../src/backend/services/AuthService');

// Mock del servizio AuthService
jest.mock('../../src/backend/services/AuthService');

describe('User Login Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/users/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'Password123!'
    };

    it('dovrebbe effettuare login con credenziali valide', async () => {
      // Arrange
      const mockUser = {
        user_id: 1,
        email: 'test@example.com',
        name: 'Mario',
        surname: 'Rossi',
        role: 'user',
        created_at: new Date()
      };

      const mockAuthResponse = {
        token: 'jwt-token-123',
        user: mockUser,
        requiresPasswordReset: false
      };

      AuthService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const response = await request(app)
        .post('/api/users/login')
        .send(validLoginData)
        .expect(200);

      // Assert
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'success',
          success: true,
          message: 'Login avvenuto con successo',
          timestamp: expect.any(String),
          data: expect.objectContaining({
            token: 'jwt-token-123',
            user: expect.objectContaining({
              user_id: 1,
              email: 'test@example.com',
              name: 'Mario',
              surname: 'Rossi',
              role: 'user'
            })
          })
        })
      );

      expect(AuthService.login).toHaveBeenCalledWith(
        validLoginData.email,
        validLoginData.password
      );
    });

    it('dovrebbe effettuare login con password temporanea e richiedere reset', async () => {
      // Arrange
      const mockUser = {
        user_id: 1,
        email: 'test@example.com',
        name: 'Mario',
        surname: 'Rossi',
        role: 'user'
      };

      const mockAuthResponse = {
        token: 'jwt-token-123',
        user: mockUser,
        requiresPasswordReset: true
      };

      AuthService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'temp-password-123'
        })
        .expect(200);

      // Assert
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'success',
          success: true,
          message: 'Login avvenuto con successo',
          timestamp: expect.any(String),
          data: {
            token: 'jwt-token-123',
            user: mockUser,
            requiresPasswordReset: true
          }
        })
      );
    });

    it('dovrebbe restituire errore 400 per dati mancanti', async () => {
      // Test senza email
      let response = await request(app)
        .post('/api/users/login')
        .send({ password: 'password123' })
        .expect(400);

      expect(response.body).toEqual({
        status: 'fail',
        message: 'Dati non validi',
        errors: expect.arrayContaining([
          expect.objectContaining({
            path: 'email',
            msg: 'Email non valida.'
          })
        ])
      });

      // Test senza password
      response = await request(app)
        .post('/api/users/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body).toEqual({
        status: 'fail',
        message: 'Dati non validi',
        errors: expect.arrayContaining([
          expect.objectContaining({
            path: 'password',
            msg: 'Password obbligatoria.'
          })
        ])
      });

      expect(AuthService.login).not.toHaveBeenCalled();
    });

    it('dovrebbe restituire errore 400 per email non valida', async () => {
      // Arrange
      const invalidEmailData = {
        email: 'invalid-email',
        password: 'password123'
      };

      // Act
      const response = await request(app)
        .post('/api/users/login')
        .send(invalidEmailData)
        .expect(400);

      // Assert
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Dati non validi');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'email',
            msg: 'Email non valida.'
          })
        ])
      );

      expect(AuthService.login).not.toHaveBeenCalled();
    });

    it('dovrebbe restituire errore 401 per credenziali invalide', async () => {
      // Arrange
      const mockError = new Error('Credenziali non valide');
      mockError.status = 401;
      
      AuthService.login.mockRejectedValue(mockError);

      // Act
      const response = await request(app)
        .post('/api/users/login')
        .send(validLoginData)
        .expect(401);

      // Assert
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Credenziali non valide');
      expect(response.body.success).toBe(false);
    });

    it('dovrebbe restituire errore 403 per manager request pending', async () => {
      // Arrange
      const mockError = new Error('Il tuo account è in attesa di approvazione come manager');
      mockError.status = 403;
      
      AuthService.login.mockRejectedValue(mockError);

      // Act
      const response = await request(app)
        .post('/api/users/login')
        .send(validLoginData)
        .expect(403);

      // Assert
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Il tuo account è in attesa di approvazione come manager');
    });

    it('dovrebbe restituire errore 400 per password temporanea scaduta', async () => {
      // Arrange
      const mockError = new Error('Password temporanea scaduta. Richiedi un nuovo reset password');
      mockError.status = 400;
      
      AuthService.login.mockRejectedValue(mockError);

      // Act
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'expired-temp-password'
        })
        .expect(400);

      // Assert
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Password temporanea scaduta. Richiedi un nuovo reset password');
    });

    it('dovrebbe gestire errori del server', async () => {
      // Arrange
      const mockError = new Error('Database connection error');
      mockError.status = 500;
      
      AuthService.login.mockRejectedValue(mockError);

      // Act
      const response = await request(app)
        .post('/api/users/login')
        .send(validLoginData)
        .expect(500);

      // Assert
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Database connection error');
    });

    it('dovrebbe normalizzare l\'email a lowercase', async () => {
      // Arrange
      const mockUser = {
        user_id: 1,
        email: 'test@example.com', // Email normalizzata
        name: 'Mario',
        surname: 'Rossi',
        role: 'user'
      };

      const mockAuthResponse = {
        token: 'jwt-token-123',
        user: mockUser,
        requiresPasswordReset: false
      };

      AuthService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'TEST@EXAMPLE.COM', // Email in uppercase
          password: 'Password123!'
        })
        .expect(200);

      // Assert
      expect(AuthService.login).toHaveBeenCalledWith(
        'test@example.com', // Dovrebbe essere normalizzata a lowercase
        'Password123!'
      );
    });

    it('dovrebbe accettare solo email e password nel body', async () => {
      // Arrange
      const mockUser = {
        user_id: 1,
        email: 'test@example.com',
        name: 'Mario',
        surname: 'Rossi',
        role: 'user'
      };

      const mockAuthResponse = {
        token: 'jwt-token-123',
        user: mockUser,
        requiresPasswordReset: false
      };

      AuthService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          extraField: 'should be ignored', // Campo extra che dovrebbe essere ignorato
          anotherField: 'also ignored'
        })
        .expect(200);

      // Assert
      expect(AuthService.login).toHaveBeenCalledWith(
        'test@example.com',
        'Password123!'
      );
    });
  });
});
