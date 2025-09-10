const ApiResponse = require('../../../src/backend/utils/apiResponse');

describe('ApiResponse', () => {
    let res;

    beforeEach(() => {
        // Mock dell'oggetto response di Express
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };
    });

    describe('success', () => {
        it('should create a basic success response', () => {
            ApiResponse.success(res);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                status: 'success',
                message: 'Operazione completata con successo',
                timestamp: expect.any(String)
            });
        });

        it('should include data when provided', () => {
            const data = { id: 1, name: 'Test' };
            ApiResponse.success(res, 200, 'Success', data);
            
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                status: 'success',
                message: 'Success',
                data,
                timestamp: expect.any(String)
            });
        });

        it('should include meta when provided', () => {
            const meta = { total: 10 };
            ApiResponse.success(res, 200, 'Success', null, meta);
            
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                status: 'success',
                message: 'Success',
                meta,
                timestamp: expect.any(String)
            });
        });
    });

    describe('error', () => {
        it('should create a basic error response', () => {
            ApiResponse.error(res);
            
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                status: 'error',
                message: 'Si è verificato un errore',
                timestamp: expect.any(String)
            });
        });

        it('should include error code when provided', () => {
            ApiResponse.error(res, 400, 'Validation error', 'VALIDATION_ERROR');
            
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                status: 'error',
                message: 'Validation error',
                code: 'VALIDATION_ERROR',
                timestamp: expect.any(String)
            });
        });
    });

    describe('helper methods', () => {
        it('should handle created response', () => {
            const data = { id: 1 };
            ApiResponse.created(res, 'Created', data);
            
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                status: 'success',
                message: 'Created',
                data,
                timestamp: expect.any(String)
            });
        });

        it('should handle not found response', () => {
            ApiResponse.notFound(res, 'User not found');
            
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                status: 'error',
                message: 'User not found',
                code: 'NOT_FOUND',
                timestamp: expect.any(String)
            });
        });

        it('should handle paginated response', () => {
            const data = [{ id: 1 }, { id: 2 }];
            const pagination = { page: 1, limit: 10, total: 20 };
            
            ApiResponse.paginated(res, data, pagination);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                status: 'success',
                message: 'Dati recuperati con successo',
                data,
                meta: {
                    pagination: {
                        page: 1,
                        limit: 10,
                        total: 20,
                        totalPages: 2,
                        hasNext: true,
                        hasPrev: false
                    }
                },
                timestamp: expect.any(String)
            });
        });

        it('should handle list response with filters', () => {
            const items = [{ id: 1 }, { id: 2 }];
            const filters = { status: 'active' };
            
            ApiResponse.list(res, items, 'List retrieved', filters);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                status: 'success',
                message: 'List retrieved',
                data: { items },
                meta: {
                    count: 2,
                    total: 2,
                    filters
                },
                timestamp: expect.any(String)
            });
        });

        it('should handle no content response', () => {
            ApiResponse.noContent(res);
            
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.send).toHaveBeenCalled();
        });
    });
});
