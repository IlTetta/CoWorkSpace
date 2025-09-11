const request = require('supertest');
const { createTestApp } = require('../helpers/testApp');
const User = require('../../src/backend/models/User');
const AuthService = require('../../src/backend/services/AuthService');
const NotificationService = require('../../src/backend/services/NotificationService');

// Mock del modello User e dei servizi
jest.mock('../../src/backend/models/User');
jest.mock('../../src/backend/services/AuthService');
jest.mock('../../src/backend/services/NotificationService');

describe('User Registration Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock NotificationService per non far fallire i test per email
    NotificationService.sendUserRegistration.mockResolvedValue(true);
    NotificationService.sendManagerRequestNotification.mockResolvedValue(true);
  });

  describe('POST /api/users/register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'Password123!',
      name: 'Mario',
      surname: 'Rossi'
    };

    it('dovrebbe registrare un nuovo utente con successo', async () => {
      // Arrange
      const mockUser = {
        user_id: 1,
        email: 'test@example.com',
        name: 'Mario',
        surname: 'Rossi',
        role: 'user',
        manager_request_pending: false,
        created_at: new Date(),
        toJSON: () => ({
          user_id: 1,
          email: 'test@example.com',
          name: 'Mario',
          surname: 'Rossi',
          role: 'user'
        })
      };

      const mockAuthResponse = {
        token: 'jwt-token-123',
        user: mockUser.toJSON(),
        canLogin: true
      };

      AuthService.register.mockResolvedValue(mockAuthResponse);

      // Act
      const response = await request(app)
        .post('/api/users/register')
        .send(validRegistrationData)
        .expect(201);

      // Assert
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'success',
          success: true,
          message: 'Registrazione avvenuta con successo',
          timestamp: expect.any(String),
          data: {
            token: 'jwt-token-123',
            user: mockUser.toJSON(),
            canLogin: true
          }
        })
      );

      expect(AuthService.register).toHaveBeenCalledWith({
        ...validRegistrationData,
        requestManagerRole: false
      });
    });

    it('dovrebbe registrare un utente con richiesta manager (senza token)', async () => {
      // Arrange
      const registrationDataWithManagerRequest = {
        ...validRegistrationData,
        requestManagerRole: true
      };

      const mockUser = {
        user_id: 1,
        email: 'test@example.com',
        name: 'Mario',
        surname: 'Rossi',
        role: 'user',
        manager_request_pending: true,
        toJSON: () => ({
          user_id: 1,
          email: 'test@example.com',
          name: 'Mario',
          surname: 'Rossi',
          role: 'user',
          manager_request_pending: true
        })
      };

      const mockAuthResponse = {
        token: null,
        user: mockUser.toJSON(),
        message: 'Registrazione completata. La tua richiesta per diventare manager è stata inviata all\'amministratore.',
        canLogin: false
      };

      AuthService.register.mockResolvedValue(mockAuthResponse);

      // Act
      const response = await request(app)
        .post('/api/users/register')
        .send(registrationDataWithManagerRequest)
        .expect(202);

      // Assert
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'success',
          success: true,
          message: 'Registrazione completata. La tua richiesta per diventare manager è stata inviata all\'amministratore.',
          timestamp: expect.any(String),
          data: {
            token: null,
            user: mockUser.toJSON(),
            canLogin: false
          }
        })
      );

      expect(AuthService.register).toHaveBeenCalledWith(registrationDataWithManagerRequest);
    });

    it('dovrebbe restituire errore 400 per dati mancanti', async () => {
      // Arrange
      const incompleteData = {
        email: 'test@example.com',
        // manca password, name, surname
      };

      // Act
      const response = await request(app)
        .post('/api/users/register')
        .send(incompleteData)
        .expect(400);

      // Assert
      expect(response.body).toEqual({
        status: 'fail',
        message: 'Dati non validi',
        errors: expect.arrayContaining([
          expect.objectContaining({
            path: 'password',
            msg: expect.any(String)
          }),
          expect.objectContaining({
            path: 'name',
            msg: expect.any(String)
          }),
          expect.objectContaining({
            path: 'surname',
            msg: expect.any(String)
          })
        ])
      });

      expect(AuthService.register).not.toHaveBeenCalled();
    });

    it('dovrebbe restituire errore 400 per email non valida', async () => {
      // Arrange
      const invalidEmailData = {
        ...validRegistrationData,
        email: 'invalid-email'
      };

      // Act
      const response = await request(app)
        .post('/api/users/register')
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

      expect(AuthService.register).not.toHaveBeenCalled();
    });

    it('dovrebbe restituire errore 400 per password troppo corta', async () => {
      // Arrange
      const shortPasswordData = {
        ...validRegistrationData,
        password: '123'
      };

      // Act
      const response = await request(app)
        .post('/api/users/register')
        .send(shortPasswordData)
        .expect(400);

      // Assert
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Dati non validi');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'password',
            msg: expect.stringContaining('8')
          })
        ])
      );
    });

    it('dovrebbe restituire errore 400 per password senza caratteri speciali', async () => {
      // Arrange
      const passwordWithoutSpecialChars = {
        ...validRegistrationData,
        password: 'Password123'
      };

      // Act
      const response = await request(app)
        .post('/api/users/register')
        .send(passwordWithoutSpecialChars)
        .expect(400);

      // Assert
      expect(response.body.status).toBe('fail');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'password',
            msg: expect.stringContaining('carattere speciale')
          })
        ])
      );
    });

    it('dovrebbe restituire errore 400 per password senza numeri', async () => {
      // Arrange
      const passwordWithoutNumbers = {
        ...validRegistrationData,
        password: 'Password!'
      };

      // Act
      const response = await request(app)
        .post('/api/users/register')
        .send(passwordWithoutNumbers)
        .expect(400);

      // Assert
      expect(response.body.status).toBe('fail');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'password',
            msg: expect.stringContaining('numero')
          })
        ])
      );
    });

    it('dovrebbe restituire errore 409 per utente già esistente', async () => {
      // Arrange
      const mockError = new Error('Utente già esistente');
      mockError.status = 409;
      
      AuthService.register.mockRejectedValue(mockError);

      // Act
      const response = await request(app)
        .post('/api/users/register')
        .send(validRegistrationData)
        .expect(409);

      // Assert
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Utente già esistente');
    });

    it('dovrebbe gestire errori del server', async () => {
      // Arrange
      const mockError = new Error('Database connection error');
      mockError.status = 500;
      
      AuthService.register.mockRejectedValue(mockError);

      // Act
      const response = await request(app)
        .post('/api/users/register')
        .send(validRegistrationData)
        .expect(500);

      // Assert
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Database connection error');
    });

    it('dovrebbe accettare requestManagerRole come booleano', async () => {
      // Arrange
      const dataWithManagerRequest = {
        ...validRegistrationData,
        requestManagerRole: false
      };

      const mockAuthResponse = {
        token: 'jwt-token-123',
        user: { user_id: 1, email: 'test@example.com' },
        canLogin: true
      };

      AuthService.register.mockResolvedValue(mockAuthResponse);

      // Act
      const response = await request(app)
        .post('/api/users/register')
        .send(dataWithManagerRequest)
        .expect(201);

      // Assert
      expect(AuthService.register).toHaveBeenCalledWith(dataWithManagerRequest);
    });
  });
});
