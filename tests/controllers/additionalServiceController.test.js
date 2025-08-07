// tests/controllers/additionalServiceController.test.js
const pool = require('../../src/backend/config/db');

// Setup mock per il pool di connessioni
jest.mock('../../src/backend/config/db', () => ({
    query: jest.fn(),
    connect: jest.fn()
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
const additionalServiceController = require('../../src/backend/controllers/additionalServiceController');

describe('AdditionalServiceController', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {},
            body: {},
            user: { user_id: 1, role: 'user' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('getAllAdditionalServices', () => {
        test('dovrebbe restituire tutti i servizi aggiuntivi attivi', async () => {
            const mockServices = [
                { service_id: 1, service_name: 'WiFi Premium', price: 10.00, is_active: true },
                { service_id: 2, service_name: 'Coffee Service', price: 5.00, is_active: true }
            ];

            pool.query.mockResolvedValue({ rows: mockServices });

            await additionalServiceController.getAllAdditionalServices(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'SELECT * FROM additional_services WHERE is_active = TRUE ORDER BY service_name'
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 2,
                data: {
                    additionalServices: mockServices
                }
            });
        });

        test('dovrebbe restituire array vuoto se non ci sono servizi', async () => {
            pool.query.mockResolvedValue({ rows: [] });

            await additionalServiceController.getAllAdditionalServices(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 0,
                data: {
                    additionalServices: []
                }
            });
        });
    });

    describe('getAdditionalServiceById', () => {
        test('dovrebbe restituire un servizio specifico per ID', async () => {
            const mockService = { service_id: 1, service_name: 'WiFi Premium', price: 10.00 };
            req.params.id = '1';

            pool.query.mockResolvedValue({ rows: [mockService] });

            await additionalServiceController.getAdditionalServiceById(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'SELECT * FROM additional_services WHERE service_id = $1',
                ['1']
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    additionalService: mockService
                }
            });
        });

        test('dovrebbe restituire 404 se il servizio non esiste', async () => {
            req.params.id = '999';
            pool.query.mockResolvedValue({ rows: [] });

            await additionalServiceController.getAdditionalServiceById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Servizio aggiuntivo non trovato'
            });
        });
    });

    describe('createAdditionalService', () => {
        test('dovrebbe creare un nuovo servizio aggiuntivo', async () => {
            const serviceData = {
                service_name: 'WiFi Premium',
                description: 'Internet ad alta velocità',
                price: 10.00,
                is_active: true
            };
            const mockCreatedService = { service_id: 1, ...serviceData };

            req.body = serviceData;
            pool.query.mockResolvedValue({ rows: [mockCreatedService] });

            await additionalServiceController.createAdditionalService(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'INSERT INTO additional_services (service_name, description, price, is_active)\n             VALUES ($1, $2, $3, $4) RETURNING *',
                [serviceData.service_name, serviceData.description, serviceData.price, serviceData.is_active]
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    additionalService: mockCreatedService
                }
            });
        });

        test('dovrebbe creare servizio con is_active=true di default', async () => {
            const serviceData = {
                service_name: 'Coffee Service',
                description: 'Servizio caffè',
                price: 5.00
            };
            const mockCreatedService = { service_id: 2, ...serviceData, is_active: true };

            req.body = serviceData;
            pool.query.mockResolvedValue({ rows: [mockCreatedService] });

            await additionalServiceController.createAdditionalService(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'INSERT INTO additional_services (service_name, description, price, is_active)\n             VALUES ($1, $2, $3, $4) RETURNING *',
                [serviceData.service_name, serviceData.description, serviceData.price, true]
            );
        });

        test('dovrebbe restituire errore 400 se manca service_name', async () => {
            req.body = { price: 10.00 };

            await additionalServiceController.createAdditionalService(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Nome del servizio e prezzo sono obbligatori.'
            });
        });

        test('dovrebbe restituire errore 400 se manca price', async () => {
            req.body = { service_name: 'Test Service' };

            await additionalServiceController.createAdditionalService(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Nome del servizio e prezzo sono obbligatori.'
            });
        });

        test('dovrebbe gestire errore di nome duplicato', async () => {
            req.body = { service_name: 'WiFi', price: 10.00 };
            const duplicateError = new Error('Duplicate key');
            duplicateError.code = '23505';
            pool.query.mockRejectedValue(duplicateError);

            await additionalServiceController.createAdditionalService(req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Un servizio con questo nome esiste già.'
            });
        });

        test('dovrebbe passare altri errori al middleware', async () => {
            req.body = { service_name: 'Test', price: 10.00 };
            const otherError = new Error('Other error');
            pool.query.mockRejectedValue(otherError);

            await additionalServiceController.createAdditionalService(req, res, next);

            expect(next).toHaveBeenCalledWith(otherError);
        });
    });

    describe('updateAdditionalService', () => {
        test('dovrebbe aggiornare tutti i campi del servizio', async () => {
            const updateData = {
                service_name: 'WiFi Updated',
                description: 'Descrizione aggiornata',
                price: 15.00,
                is_active: false
            };
            const mockUpdatedService = { service_id: 1, ...updateData };

            req.params.id = '1';
            req.body = updateData;
            pool.query.mockResolvedValue({ rows: [mockUpdatedService] });

            await additionalServiceController.updateAdditionalService(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'UPDATE additional_services SET service_name = $2, description = $3, price = $4, is_active = $5 WHERE service_id = $1 RETURNING *',
                ['1', updateData.service_name, updateData.description, updateData.price, updateData.is_active]
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    additionalService: mockUpdatedService
                }
            });
        });

        test('dovrebbe aggiornare solo i campi forniti', async () => {
            const updateData = { service_name: 'WiFi Updated', price: 15.00 };
            const mockUpdatedService = { service_id: 1, ...updateData };

            req.params.id = '1';
            req.body = updateData;
            pool.query.mockResolvedValue({ rows: [mockUpdatedService] });

            await additionalServiceController.updateAdditionalService(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'UPDATE additional_services SET service_name = $2, price = $3 WHERE service_id = $1 RETURNING *',
                ['1', updateData.service_name, updateData.price]
            );
        });

        test('dovrebbe restituire errore 400 se nessun campo è fornito', async () => {
            req.params.id = '1';
            req.body = {};

            await additionalServiceController.updateAdditionalService(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Nessun campo valido fornito per l\'aggiornamento.'
            });
        });

        test('dovrebbe restituire 404 se il servizio non esiste', async () => {
            req.params.id = '999';
            req.body = { service_name: 'Test' };
            pool.query.mockResolvedValue({ rows: [] });

            await additionalServiceController.updateAdditionalService(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Servizio aggiuntivo non trovato'
            });
        });

        test('dovrebbe gestire errore di nome duplicato', async () => {
            req.params.id = '1';
            req.body = { service_name: 'WiFi' };
            const duplicateError = new Error('Duplicate key');
            duplicateError.code = '23505';
            pool.query.mockRejectedValue(duplicateError);

            await additionalServiceController.updateAdditionalService(req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Un servizio con questo nome esiste già.'
            });
        });
    });

    describe('deleteAdditionalService', () => {
        test('dovrebbe eliminare un servizio aggiuntivo', async () => {
            const mockDeletedService = { service_id: 1, service_name: 'WiFi' };
            req.params.id = '1';
            pool.query.mockResolvedValue({ rows: [mockDeletedService] });

            await additionalServiceController.deleteAdditionalService(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'DELETE FROM additional_services WHERE service_id = $1 RETURNING *',
                ['1']
            );
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: null
            });
        });

        test('dovrebbe restituire 404 se il servizio non esiste', async () => {
            req.params.id = '999';
            pool.query.mockResolvedValue({ rows: [] });

            await additionalServiceController.deleteAdditionalService(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Servizio aggiuntivo non trovato'
            });
        });
    });

    describe('addServiceToSpace', () => {
        test('dovrebbe associare un servizio a uno spazio', async () => {
            req.params = { serviceId: '1', spaceId: '1' };
            
            // Mock per verificare esistenza servizio e spazio
            pool.query
                .mockResolvedValueOnce({ rows: [{ service_id: 1 }] }) // servizio esiste
                .mockResolvedValueOnce({ rows: [{ space_id: 1 }] })   // spazio esiste
                .mockResolvedValueOnce({ rows: [{ space_id: 1, service_id: 1 }] }); // inserimento

            await additionalServiceController.addServiceToSpace(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(1,
                'SELECT 1 FROM additional_services WHERE service_id = $1',
                ['1']
            );
            expect(pool.query).toHaveBeenNthCalledWith(2,
                'SELECT 1 FROM spaces WHERE space_id = $1',
                ['1']
            );
            expect(pool.query).toHaveBeenNthCalledWith(3,
                'INSERT INTO space_services (space_id, service_id) VALUES ($1, $2) RETURNING *',
                ['1', '1']
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                message: 'Servizio associato allo spazio con successo.'
            });
        });

        test('dovrebbe restituire 404 se il servizio non esiste', async () => {
            req.params = { serviceId: '999', spaceId: '1' };
            pool.query.mockResolvedValueOnce({ rows: [] }); // servizio non esiste

            await additionalServiceController.addServiceToSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Servizio non trovato.'
            });
        });

        test('dovrebbe restituire 404 se lo spazio non esiste', async () => {
            req.params = { serviceId: '1', spaceId: '999' };
            pool.query
                .mockResolvedValueOnce({ rows: [{ service_id: 1 }] }) // servizio esiste
                .mockResolvedValueOnce({ rows: [] }); // spazio non esiste

            await additionalServiceController.addServiceToSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Spazio non trovato.'
            });
        });

        test('dovrebbe gestire errore di associazione duplicata', async () => {
            req.params = { serviceId: '1', spaceId: '1' };
            
            pool.query
                .mockResolvedValueOnce({ rows: [{ service_id: 1 }] })
                .mockResolvedValueOnce({ rows: [{ space_id: 1 }] });

            const duplicateError = new Error('Duplicate key');
            duplicateError.code = '23505';
            pool.query.mockRejectedValueOnce(duplicateError);

            await additionalServiceController.addServiceToSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Questo servizio è già associato a questo spazio.'
            });
        });
    });

    describe('removeServiceFromSpace', () => {
        test('dovrebbe rimuovere associazione servizio-spazio', async () => {
            req.params = { serviceId: '1', spaceId: '1' };
            const mockDeletedAssociation = { space_id: 1, service_id: 1 };
            pool.query.mockResolvedValue({ rows: [mockDeletedAssociation] });

            await additionalServiceController.removeServiceFromSpace(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'DELETE FROM space_services WHERE space_id = $1 AND service_id = $2 RETURNING *',
                ['1', '1']
            );
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: null
            });
        });

        test('dovrebbe restituire 404 se associazione non esiste', async () => {
            req.params = { serviceId: '999', spaceId: '999' };
            pool.query.mockResolvedValue({ rows: [] });

            await additionalServiceController.removeServiceFromSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Associazione servizio-spazio non trovata.'
            });
        });
    });

    describe('getServicesBySpace', () => {
        test('dovrebbe restituire tutti i servizi di uno spazio', async () => {
            const mockServices = [
                { service_id: 1, service_name: 'WiFi', price: 10.00 },
                { service_id: 2, service_name: 'Coffee', price: 5.00 }
            ];
            req.params.spaceId = '1';
            pool.query.mockResolvedValue({ rows: mockServices });

            await additionalServiceController.getServicesBySpace(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'SELECT ads.*\n         FROM additional_services ads\n         JOIN space_services ss ON ads.service_id = ss.service_id\n         WHERE ss.space_id = $1 AND ads.is_active = TRUE\n         ORDER BY ads.service_name',
                ['1']
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 2,
                data: {
                    services: mockServices
                }
            });
        });

        test('dovrebbe restituire array vuoto se spazio non ha servizi', async () => {
            req.params.spaceId = '1';
            pool.query.mockResolvedValue({ rows: [] });

            await additionalServiceController.getServicesBySpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 0,
                data: {
                    services: []
                }
            });
        });
    });
});