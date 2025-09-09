// tests/controllers/availabilityController.test.js
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
const availabilityController = require('../../src/backend/controllers/availabilityController');

describe('availabilityController.getSpaceAvailability', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {
                space_id: 1,
                start_date: '2024-08-15',
                end_date: '2024-08-20'
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Recupero disponibilità con successo', () => {
        it('dovrebbe restituire la disponibilità dello spazio', async () => {
            const availabilityData = [
                {
                    availability_id: 1,
                    space_id: 1,
                    availability_date: '2024-08-15',
                    start_time: '09:00',
                    end_time: '17:00',
                    is_available: true
                },
                {
                    availability_id: 2,
                    space_id: 1,
                    availability_date: '2024-08-16',
                    start_time: '09:00',
                    end_time: '17:00',
                    is_available: true
                }
            ];

            // Mock per verifica spazio esistente
            pool.query.mockResolvedValueOnce({ rows: [{ space_id: 1 }] });
            // Mock per query disponibilità
            pool.query.mockResolvedValueOnce({ rows: availabilityData });

            await availabilityController.getSpaceAvailability(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(1,
                'SELECT 1 FROM spaces WHERE space_id = $1',
                [1]
            );
            expect(pool.query).toHaveBeenNthCalledWith(2,
                expect.stringContaining('SELECT * FROM availability'),
                [1, '2024-08-15', '2024-08-20']
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 2,
                data: {
                    availability: availabilityData
                }
            });
        });

        it('dovrebbe gestire risultati vuoti', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ space_id: 1 }] }); // spazio esiste
            pool.query.mockResolvedValueOnce({ rows: [] }); // nessuna disponibilità

            await availabilityController.getSpaceAvailability(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 0,
                data: {
                    availability: []
                }
            });
        });

        it('dovrebbe gestire space_id diversi', async () => {
            req.body.space_id = 5;

            pool.query.mockResolvedValueOnce({ rows: [{ space_id: 5 }] });
            pool.query.mockResolvedValueOnce({ rows: [] });

            await availabilityController.getSpaceAvailability(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(1,
                'SELECT 1 FROM spaces WHERE space_id = $1',
                [5]
            );
        });

        it('dovrebbe gestire intervalli di date diversi', async () => {
            req.body.start_date = '2024-09-01';
            req.body.end_date = '2024-09-30';

            pool.query.mockResolvedValueOnce({ rows: [{ space_id: 1 }] });
            pool.query.mockResolvedValueOnce({ rows: [] });

            await availabilityController.getSpaceAvailability(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(2,
                expect.stringContaining('availability_date >= $2'),
                [1, '2024-09-01', '2024-09-30']
            );
        });
    });

    describe('Validazione input', () => {
        it('dovrebbe restituire errore 400 se manca space_id', async () => {
            req.body.space_id = undefined;

            await availabilityController.getSpaceAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Space ID, data di inizio e data di fine sono obbligatori per la ricerca di disponibilità.'
            });
        });

        it('dovrebbe restituire errore 400 se manca start_date', async () => {
            req.body.start_date = undefined;

            await availabilityController.getSpaceAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe restituire errore 400 se manca end_date', async () => {
            req.body.end_date = undefined;

            await availabilityController.getSpaceAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe gestire valori null', async () => {
            req.body.space_id = null;
            req.body.start_date = null;

            await availabilityController.getSpaceAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe gestire stringhe vuote', async () => {
            req.body.space_id = '';
            req.body.start_date = '';
            req.body.end_date = '';

            await availabilityController.getSpaceAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('Spazio non trovato', () => {
        it('dovrebbe restituire errore 404 se spazio non esiste', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] }); // spazio non trovato

            await availabilityController.getSpaceAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Spazio non trovato.'
            });
        });

        it('dovrebbe verificare space_id inesistente', async () => {
            req.body.space_id = 99999;
            pool.query.mockResolvedValueOnce({ rows: [] });

            await availabilityController.getSpaceAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('Query di disponibilità', () => {
        it('dovrebbe filtrare solo disponibilità true', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ space_id: 1 }] });
            pool.query.mockResolvedValueOnce({ rows: [] });

            await availabilityController.getSpaceAvailability(req, res, next);

            const [query, params] = pool.query.mock.calls[1];
            expect(query).toContain('is_available = true');
        });

        it('dovrebbe ordinare per data e ora', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ space_id: 1 }] });
            pool.query.mockResolvedValueOnce({ rows: [] });

            await availabilityController.getSpaceAvailability(req, res, next);

            const [query] = pool.query.mock.calls[1];
            expect(query).toContain('ORDER BY availability_date, start_time');
        });

        it('dovrebbe filtrare per intervallo di date', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ space_id: 1 }] });
            pool.query.mockResolvedValueOnce({ rows: [] });

            await availabilityController.getSpaceAvailability(req, res, next);

            const [query] = pool.query.mock.calls[1];
            expect(query).toContain('availability_date >= $2');
            expect(query).toContain('availability_date <= $3');
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore durante verifica spazio', async () => {
            const dbError = new Error('Database connection failed');
            pool.query.mockRejectedValueOnce(dbError);

            await availabilityController.getSpaceAvailability(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });

        it('dovrebbe gestire errore durante query disponibilità', async () => {
            const dbError = new Error('Availability query failed');
            pool.query.mockResolvedValueOnce({ rows: [{ space_id: 1 }] });
            pool.query.mockRejectedValueOnce(dbError);

            await availabilityController.getSpaceAvailability(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });
    });
});

describe('availabilityController.createAvailability', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {
                space_id: 1,
                availability_date: '2024-08-15',
                start_time: '09:00',
                end_time: '17:00',
                is_available: true
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Creazione disponibilità con successo', () => {
        it('dovrebbe creare una nuova disponibilità', async () => {
            const newAvailability = {
                availability_id: 1,
                space_id: 1,
                availability_date: '2024-08-15',
                start_time: '09:00',
                end_time: '17:00',
                is_available: true
            };

            pool.query.mockResolvedValueOnce({ rows: [{ space_id: 1 }] }); // spazio esiste
            pool.query.mockResolvedValueOnce({ rows: [newAvailability] }); // inserimento

            await availabilityController.createAvailability(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(2,
                expect.stringContaining('INSERT INTO availability'),
                [1, '2024-08-15', '09:00', '17:00', true]
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    availability: newAvailability
                }
            });
        });

        it('dovrebbe creare disponibilità con is_available di default true', async () => {
            const newAvailability = {
                availability_id: 2,
                space_id: 1,
                is_available: true
            };

            req.body.is_available = undefined;

            pool.query.mockResolvedValueOnce({ rows: [{ space_id: 1 }] });
            pool.query.mockResolvedValueOnce({ rows: [newAvailability] });

            await availabilityController.createAvailability(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(2,
                expect.stringContaining('INSERT INTO availability'),
                [1, '2024-08-15', '09:00', '17:00', true]
            );
        });

        it('dovrebbe creare disponibilità con is_available false', async () => {
            const newAvailability = {
                availability_id: 3,
                is_available: false
            };

            req.body.is_available = false;

            pool.query.mockResolvedValueOnce({ rows: [{ space_id: 1 }] });
            pool.query.mockResolvedValueOnce({ rows: [newAvailability] });

            await availabilityController.createAvailability(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(2,
                expect.stringContaining('INSERT INTO availability'),
                [1, '2024-08-15', '09:00', '17:00', false]
            );
        });

        it('dovrebbe gestire orari diversi', async () => {
            const newAvailability = { availability_id: 4 };

            req.body.start_time = '14:00';
            req.body.end_time = '22:00';

            pool.query.mockResolvedValueOnce({ rows: [{ space_id: 1 }] });
            pool.query.mockResolvedValueOnce({ rows: [newAvailability] });

            await availabilityController.createAvailability(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(2,
                expect.stringContaining('INSERT INTO availability'),
                [1, '2024-08-15', '14:00', '22:00', true]
            );
        });
    });

    describe('Validazione input', () => {
        it('dovrebbe restituire errore 400 se manca space_id', async () => {
            req.body.space_id = undefined;

            await availabilityController.createAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Space ID, data, ora di inizio e ora di fine sono obbligatori.'
            });
        });

        it('dovrebbe restituire errore 400 se manca availability_date', async () => {
            req.body.availability_date = undefined;

            await availabilityController.createAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe restituire errore 400 se manca start_time', async () => {
            req.body.start_time = undefined;

            await availabilityController.createAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe restituire errore 400 se manca end_time', async () => {
            req.body.end_time = undefined;

            await availabilityController.createAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe gestire valori null', async () => {
            req.body.space_id = null;
            req.body.availability_date = null;

            await availabilityController.createAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('Spazio non trovato', () => {
        it('dovrebbe restituire errore 404 se spazio non esiste', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] }); // spazio non trovato

            await availabilityController.createAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Spazio non trovato.'
            });
        });
    });

    describe('Gestione conflitti', () => {
        it('dovrebbe restituire errore 409 per disponibilità duplicata', async () => {
            const duplicateError = new Error('Duplicate key value');
            duplicateError.code = '23505';

            pool.query.mockResolvedValueOnce({ rows: [{ space_id: 1 }] });
            pool.query.mockRejectedValueOnce(duplicateError);

            await availabilityController.createAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Blocco di disponibilità già esistente per lo spazio e l\'orario specificati.'
            });
        });

        it('dovrebbe passare altri errori al middleware', async () => {
            const otherError = new Error('Other database error');
            otherError.code = '23503'; // Foreign key constraint

            pool.query.mockResolvedValueOnce({ rows: [{ space_id: 1 }] });
            pool.query.mockRejectedValueOnce(otherError);

            await availabilityController.createAvailability(req, res, next);

            expect(next).toHaveBeenCalledWith(otherError);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore durante verifica spazio', async () => {
            const dbError = new Error('Database connection failed');
            pool.query.mockRejectedValueOnce(dbError);

            await availabilityController.createAvailability(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });
    });

    describe('Casi edge', () => {
        it('dovrebbe gestire is_available esplicitamente false', async () => {
            const newAvailability = { availability_id: 5, is_available: false };

            req.body.is_available = false;

            pool.query.mockResolvedValueOnce({ rows: [{ space_id: 1 }] });
            pool.query.mockResolvedValueOnce({ rows: [newAvailability] });

            await availabilityController.createAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('dovrebbe gestire space_id numerico grande', async () => {
            const newAvailability = { availability_id: 6 };

            req.body.space_id = 999999;

            pool.query.mockResolvedValueOnce({ rows: [{ space_id: 999999 }] });
            pool.query.mockResolvedValueOnce({ rows: [newAvailability] });

            await availabilityController.createAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });
    });
});

describe('availabilityController.updateAvailability', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: { id: '1' },
            body: {
                space_id: 2,
                availability_date: '2024-08-16',
                start_time: '10:00',
                end_time: '18:00',
                is_available: false
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Aggiornamento disponibilità con successo', () => {
        it('dovrebbe aggiornare tutti i campi della disponibilità', async () => {
            const updatedAvailability = {
                availability_id: 1,
                space_id: 2,
                availability_date: '2024-08-16',
                start_time: '10:00',
                end_time: '18:00',
                is_available: false
            };

            pool.query.mockResolvedValueOnce({ rows: [{ space_id: 2 }] }); // validazione space_id
            pool.query.mockResolvedValueOnce({ rows: [updatedAvailability] }); // update

            await availabilityController.updateAvailability(req, res, next);

            const [query, params] = pool.query.mock.calls[1];
            expect(query).toContain('UPDATE availability');
            expect(query).toContain('space_id = $2');
            expect(query).toContain('availability_date = $3');
            expect(query).toContain('start_time = $4');
            expect(query).toContain('end_time = $5');
            expect(query).toContain('is_available = $6');
            expect(params).toEqual(['1', 2, '2024-08-16', '10:00', '18:00', false]);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    availability: updatedAvailability
                }
            });
        });

        it('dovrebbe aggiornare solo alcuni campi', async () => {
            const updatedAvailability = {
                availability_id: 1,
                is_available: true
            };

            req.body = {
                is_available: true
            };

            pool.query.mockResolvedValueOnce({ rows: [updatedAvailability] });

            await availabilityController.updateAvailability(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('SET is_available = $2'),
                ['1', true]
            );
        });

        it('dovrebbe validare space_id se fornito', async () => {
            const updatedAvailability = { availability_id: 1, space_id: 5 };

            req.body = { space_id: 5 };

            pool.query.mockResolvedValueOnce({ rows: [{ space_id: 5 }] }); // validazione
            pool.query.mockResolvedValueOnce({ rows: [updatedAvailability] }); // update

            await availabilityController.updateAvailability(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(1,
                'SELECT 1 FROM spaces WHERE space_id = $1',
                [5]
            );
        });

        it('dovrebbe gestire aggiornamento di availability_date', async () => {
            const updatedAvailability = { availability_id: 1 };

            req.body = {
                availability_date: '2024-09-01'
            };

            pool.query.mockResolvedValueOnce({ rows: [updatedAvailability] });

            await availabilityController.updateAvailability(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('SET availability_date = $2'),
                ['1', '2024-09-01']
            );
        });

        it('dovrebbe gestire aggiornamento di orari', async () => {
            const updatedAvailability = { availability_id: 1 };

            req.body = {
                start_time: '08:00',
                end_time: '20:00'
            };

            pool.query.mockResolvedValueOnce({ rows: [updatedAvailability] });

            await availabilityController.updateAvailability(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('start_time = $2, end_time = $3'),
                ['1', '08:00', '20:00']
            );
        });
    });

    describe('Validazione space_id', () => {
        it('dovrebbe restituire errore 400 se space_id non valido', async () => {
            req.body = { space_id: 999 };

            pool.query.mockResolvedValueOnce({ rows: [] }); // space_id non trovato

            await availabilityController.updateAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Space ID non valido.'
            });
        });

        it('non dovrebbe validare space_id se non fornito', async () => {
            const updatedAvailability = { availability_id: 1 };

            req.body = { is_available: true };

            pool.query.mockResolvedValueOnce({ rows: [updatedAvailability] });

            await availabilityController.updateAvailability(req, res, next);

            expect(pool.query).toHaveBeenCalledTimes(1); // solo update, no validazione
        });
    });

    describe('Validazione campi', () => {
        it('dovrebbe restituire errore 400 se nessun campo fornito', async () => {
            req.body = {};

            await availabilityController.updateAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Nessun campo valido fornito per l\'aggiornamento.'
            });
        });

        it('dovrebbe ignorare campi undefined', async () => {
            req.body = {
                space_id: undefined,
                availability_date: undefined,
                start_time: '09:00'
            };

            const updatedAvailability = { availability_id: 1 };
            pool.query.mockResolvedValueOnce({ rows: [updatedAvailability] });

            await availabilityController.updateAvailability(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('SET start_time = $2'),
                ['1', '09:00']
            );
        });

        it('dovrebbe gestire is_available false esplicitamente', async () => {
            const updatedAvailability = { availability_id: 1 };

            req.body = { is_available: false };

            pool.query.mockResolvedValueOnce({ rows: [updatedAvailability] });

            await availabilityController.updateAvailability(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('SET is_available = $2'),
                ['1', false]
            );
        });
    });

    describe('Disponibilità non trovata', () => {
        it('dovrebbe restituire errore 404 se disponibilità non esiste', async () => {
            req.body = { is_available: true };

            pool.query.mockResolvedValueOnce({ rows: [] }); // update non trova la disponibilità

            await availabilityController.updateAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Disponibilità non trovata.'
            });
        });
    });

    describe('Gestione conflitti', () => {
        it('dovrebbe restituire errore 409 per conflitto duplicata', async () => {
            const duplicateError = new Error('Duplicate key value');
            duplicateError.code = '23505';

            req.body = { availability_date: '2024-08-16' };

            pool.query.mockRejectedValueOnce(duplicateError);

            await availabilityController.updateAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Blocco di disponibilità già esistente per lo spazio e l\'orario specificati.'
            });
        });

        it('dovrebbe passare altri errori al middleware', async () => {
            const otherError = new Error('Other database error');
            otherError.code = '23503';

            req.body = { is_available: true };

            pool.query.mockRejectedValueOnce(otherError);

            await availabilityController.updateAvailability(req, res, next);

            expect(next).toHaveBeenCalledWith(otherError);
        });
    });

    describe('Costruzione query dinamica', () => {
        it('dovrebbe costruire query con tutti i campi nell\'ordine corretto', async () => {
            const updatedAvailability = { availability_id: 1 };

            pool.query.mockResolvedValueOnce({ rows: [{ space_id: 2 }] }); // validazione
            pool.query.mockResolvedValueOnce({ rows: [updatedAvailability] }); // update

            await availabilityController.updateAvailability(req, res, next);

            const [query, params] = pool.query.mock.calls[1];
            expect(query).toContain('space_id = $2');
            expect(query).toContain('availability_date = $3');
            expect(query).toContain('start_time = $4');
            expect(query).toContain('end_time = $5');
            expect(query).toContain('is_available = $6');
            expect(params).toEqual(['1', 2, '2024-08-16', '10:00', '18:00', false]);
        });

        it('dovrebbe costruire query con ordine corretto per campi parziali', async () => {
            const updatedAvailability = { availability_id: 1 };

            req.body = {
                end_time: '19:00',
                is_available: true,
                start_time: '08:00'
            };

            pool.query.mockResolvedValueOnce({ rows: [updatedAvailability] });

            await availabilityController.updateAvailability(req, res, next);

            const [query, params] = pool.query.mock.calls[0];
            expect(query).toContain('start_time = $2');
            expect(query).toContain('end_time = $3');
            expect(query).toContain('is_available = $4');
            expect(params).toEqual(['1', '08:00', '19:00', true]);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore durante validazione space_id', async () => {
            const dbError = new Error('Database connection failed');
            req.body = { space_id: 5 };

            pool.query.mockRejectedValueOnce(dbError);

            await availabilityController.updateAvailability(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });

        it('dovrebbe gestire errore durante update', async () => {
            const updateError = new Error('Update failed');
            req.body = { is_available: true };

            pool.query.mockRejectedValueOnce(updateError);

            await availabilityController.updateAvailability(req, res, next);

            expect(next).toHaveBeenCalledWith(updateError);
        });
    });
});

describe('availabilityController.deleteAvailability', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: { id: '1' }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Eliminazione con successo', () => {
        it('dovrebbe eliminare la disponibilità', async () => {
            const deletedAvailability = {
                availability_id: 1,
                space_id: 1,
                availability_date: '2024-08-15'
            };

            pool.query.mockResolvedValueOnce({ rows: [deletedAvailability] });

            await availabilityController.deleteAvailability(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'DELETE FROM availability WHERE availability_id = $1 RETURNING *',
                ['1']
            );
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: null
            });
        });

        it('dovrebbe gestire ID diversi', async () => {
            const deletedAvailability = { availability_id: 999 };

            req.params.id = '999';

            pool.query.mockResolvedValueOnce({ rows: [deletedAvailability] });

            await availabilityController.deleteAvailability(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'DELETE FROM availability WHERE availability_id = $1 RETURNING *',
                ['999']
            );
        });

        it('dovrebbe funzionare con ID numerici grandi', async () => {
            const deletedAvailability = { availability_id: 2147483647 };

            req.params.id = '2147483647';

            pool.query.mockResolvedValueOnce({ rows: [deletedAvailability] });

            await availabilityController.deleteAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(204);
        });
    });

    describe('Disponibilità non trovata', () => {
        it('dovrebbe restituire errore 404 se disponibilità non esiste', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            await availabilityController.deleteAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Disponibilità non trovata.'
            });
        });

        it('dovrebbe gestire ID inesistente', async () => {
            req.params.id = '99999';

            pool.query.mockResolvedValueOnce({ rows: [] });

            await availabilityController.deleteAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore del database', async () => {
            const dbError = new Error('Database connection failed');

            pool.query.mockRejectedValueOnce(dbError);

            await availabilityController.deleteAvailability(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });

        it('dovrebbe gestire errori di foreign key constraint', async () => {
            const fkError = new Error('Foreign key constraint violation');
            fkError.code = '23503';

            pool.query.mockRejectedValueOnce(fkError);

            await availabilityController.deleteAvailability(req, res, next);

            expect(next).toHaveBeenCalledWith(fkError);
        });

        it('dovrebbe gestire errori di constraint check', async () => {
            const constraintError = new Error('Check constraint violation');
            constraintError.code = '23514';

            pool.query.mockRejectedValueOnce(constraintError);

            await availabilityController.deleteAvailability(req, res, next);

            expect(next).toHaveBeenCalledWith(constraintError);
        });
    });

    describe('Validazione parametri', () => {
        it('dovrebbe gestire ID come stringa', async () => {
            const deletedAvailability = { availability_id: 1 };

            req.params.id = '1';

            pool.query.mockResolvedValueOnce({ rows: [deletedAvailability] });

            await availabilityController.deleteAvailability(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'DELETE FROM availability WHERE availability_id = $1 RETURNING *',
                ['1']
            );
        });
    });

    describe('Formato risposta', () => {
        it('dovrebbe avere formato risposta corretto per eliminazione', async () => {
            const deletedAvailability = { availability_id: 1 };

            pool.query.mockResolvedValueOnce({ rows: [deletedAvailability] });

            await availabilityController.deleteAvailability(req, res, next);

            const response = res.json.mock.calls[0][0];
            expect(response).toHaveProperty('status', 'success');
            expect(response).toHaveProperty('data', null);
        });

        it('dovrebbe restituire status 204 per eliminazione riuscita', async () => {
            const deletedAvailability = { availability_id: 1 };

            pool.query.mockResolvedValueOnce({ rows: [deletedAvailability] });

            await availabilityController.deleteAvailability(req, res, next);

            expect(res.status).toHaveBeenCalledWith(204);
        });
    });
});