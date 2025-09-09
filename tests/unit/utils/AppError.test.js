const AppError = require('../../../src/backend/utils/AppError');
const { ERROR_CODES, ERROR_MESSAGES } = require('../../../src/backend/utils/errorCodes');

describe('AppError', () => {
    describe('Constructor', () => {
        it('should create an error with basic properties', () => {
            const error = new AppError('Test error', 400);
            
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(AppError);
            expect(error.message).toBe('Test error');
            expect(error.statusCode).toBe(400);
            expect(error.status).toBe('fail');
            expect(error.isOperational).toBe(true);
            expect(error.timestamp).toBeDefined();
            expect(error.stack).toBeDefined();
        });

        it('should set status to error for 5xx status codes', () => {
            const error = new AppError('Server error', 500);
            expect(error.status).toBe('error');
        });
    });

    describe('Factory Methods', () => {
        it('should create a badRequest error', () => {
            const details = { field: 'email', message: 'Invalid email' };
            const error = AppError.badRequest('Invalid input', details);
            
            expect(error.statusCode).toBe(400);
            expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
            expect(error.details).toEqual(details);
        });

        it('should create an unauthorized error', () => {
            const error = AppError.unauthorized();
            
            expect(error.statusCode).toBe(401);
            expect(error.code).toBe(ERROR_CODES.UNAUTHORIZED);
            expect(error.message).toBe(ERROR_MESSAGES[ERROR_CODES.UNAUTHORIZED]);
        });

        it('should create a notFound error', () => {
            const error = AppError.notFound('User');
            
            expect(error.statusCode).toBe(404);
            expect(error.code).toBe(ERROR_CODES.NOT_FOUND);
            expect(error.message).toBe('User non trovata');
        });

        it('should create a duplicateEmail error', () => {
            const email = 'test@example.com';
            const error = AppError.duplicateEmail(email);
            
            expect(error.statusCode).toBe(409);
            expect(error.code).toBe(ERROR_CODES.DUPLICATE_EMAIL);
            expect(error.details).toEqual({ email });
            expect(error.message).toBe(`L'email ${email} è già registrata`);
        });
    });

    describe('Database Error Handling', () => {
        it('should handle PostgreSQL unique violation for email', () => {
            const pgError = {
                code: '23505',
                constraint: 'users_email_key',
                detail: 'Key (email)=(test@example.com) already exists.'
            };
            
            const error = AppError.fromDatabaseError(pgError);
            
            expect(error.statusCode).toBe(409);
            expect(error.code).toBe(ERROR_CODES.DUPLICATE_EMAIL);
            expect(error.details).toBeDefined();
        });

        it('should handle unknown PostgreSQL errors', () => {
            const pgError = {
                code: '99999',
                message: 'Unknown error'
            };
            
            const error = AppError.fromDatabaseError(pgError);
            
            expect(error.statusCode).toBe(500);
            expect(error.code).toBe(ERROR_CODES.DATABASE_ERROR);
        });
    });

    describe('Serialization', () => {
        it('should serialize to JSON with all properties', () => {
            const error = new AppError('Test error', 400, 'TEST_CODE', { test: true });
            const json = error.toJSON();
            
            expect(json).toEqual({
                name: 'AppError',
                message: 'Test error',
                statusCode: 400,
                status: 'fail',
                code: 'TEST_CODE',
                details: { test: true },
                timestamp: expect.any(String),
                stack: expect.any(String)
            });
        });
    });
});
