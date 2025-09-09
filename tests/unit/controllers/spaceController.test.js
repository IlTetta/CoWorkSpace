// tests/controllers/spaceController.test.js
const db = require('../../src/backend/config/db');

// Setup mock
jest.mock('../../src/backend/config/db');
jest.mock('../../src/backend/utils/catchAsync', () => (fn) => fn);

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
const spaceController = require('../../src/backend/controllers/spaceController');

describe('spaceController.getAllSpaces', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            query: {}
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Recupero spazi senza filtri', () => {
        it('dovrebbe restituire tutti gli spazi', async () => {
            const mockSpaces = [
                {
                    space_id: 1,
                    location_id: 1,
                    space_type_id: 1,
                    space_name: 'Ufficio 1',
                    description: 'Ufficio moderno',
                    capacity: 4,
                    price_per_hour: 25.00,
                    price_per_day: 200.00,
                    location_name: 'Milano Centro',
                    type_name: 'Ufficio'
                },
                {
                    space_id: 2,
                    location_id: 2,
                    space_type_id: 2,
                    space_name: 'Sala Riunioni A',
                    description: 'Sala per riunioni',
                    capacity: 10,
                    price_per_hour: 50.00,
                    price_per_day: 400.00,
                    location_name: 'Roma Nord',
                    type_name: 'Sala Riunioni'
                }
            ];

            db.query.mockResolvedValue({ rows: mockSpaces });

            await spaceController.getAllSpaces(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 2,
                data: {
                    spaces: mockSpaces
                }
            });
        });

        it('dovrebbe chiamare db.query con la query base corretta', async () => {
            db.query.mockResolvedValue({ rows: [] });

            await spaceController.getAllSpaces(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'SELECT s.*, l.location_name, st.type_name FROM spaces s JOIN locations l ON s.location_id = l.location_id JOIN space_types st ON s.space_type_id = st.space_type_id',
                []
            );
        });

        it('dovrebbe restituire array vuoto se non ci sono spazi', async () => {
            db.query.mockResolvedValue({ rows: [] });

            await spaceController.getAllSpaces(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 0,
                data: {
                    spaces: []
                }
            });
        });
    });

    describe('Filtri per location_id', () => {
        it('dovrebbe filtrare per location_id', async () => {
            const mockSpaces = [
                {
                    space_id: 1,
                    location_id: 1,
                    space_name: 'Ufficio 1',
                    location_name: 'Milano Centro',
                    type_name: 'Ufficio'
                }
            ];

            req.query.location_id = '1';
            db.query.mockResolvedValue({ rows: mockSpaces });

            await spaceController.getAllSpaces(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'SELECT s.*, l.location_name, st.type_name FROM spaces s JOIN locations l ON s.location_id = l.location_id JOIN space_types st ON s.space_type_id = st.space_type_id WHERE s.location_id = $1',
                ['1']
            );
        });

        it('dovrebbe funzionare con diversi location_id', async () => {
            req.query.location_id = '5';
            db.query.mockResolvedValue({ rows: [] });

            await spaceController.getAllSpaces(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE s.location_id = $1'),
                ['5']
            );
        });
    });

    describe('Filtri per space_type_id', () => {
        it('dovrebbe filtrare per space_type_id', async () => {
            const mockSpaces = [
                {
                    space_id: 1,
                    space_type_id: 2,
                    space_name: 'Sala Riunioni',
                    type_name: 'Sala Riunioni'
                }
            ];

            req.query.space_type_id = '2';
            db.query.mockResolvedValue({ rows: mockSpaces });

            await spaceController.getAllSpaces(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'SELECT s.*, l.location_name, st.type_name FROM spaces s JOIN locations l ON s.location_id = l.location_id JOIN space_types st ON s.space_type_id = st.space_type_id WHERE s.space_type_id = $1',
                ['2']
            );
        });
    });

    describe('Filtri combinati', () => {
        it('dovrebbe filtrare per location_id e space_type_id insieme', async () => {
            req.query.location_id = '1';
            req.query.space_type_id = '2';
            db.query.mockResolvedValue({ rows: [] });

            await spaceController.getAllSpaces(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'SELECT s.*, l.location_name, st.type_name FROM spaces s JOIN locations l ON s.location_id = l.location_id JOIN space_types st ON s.space_type_id = st.space_type_id WHERE s.location_id = $1 AND s.space_type_id = $2',
                ['1', '2']
            );
        });

        it('dovrebbe costruire la query con ordine corretto dei parametri', async () => {
            req.query.space_type_id = '3';
            req.query.location_id = '4';
            db.query.mockResolvedValue({ rows: [] });

            await spaceController.getAllSpaces(req, res, next);

            // Verifica che i parametri siano nell'ordine corretto (location_id prima, space_type_id dopo)
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE s.location_id = $1 AND s.space_type_id = $2'),
                ['4', '3']
            );
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore del database', async () => {
            const dbError = new Error('Database connection failed');
            db.query.mockRejectedValue(dbError);

            await spaceController.getAllSpaces(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('dovrebbe gestire timeout del database', async () => {
            const timeoutError = new Error('Query timeout');
            timeoutError.code = 'ETIMEDOUT';
            db.query.mockRejectedValue(timeoutError);

            await spaceController.getAllSpaces(req, res, next);

            expect(next).toHaveBeenCalledWith(timeoutError);
        });
    });

    describe('Formato risposta', () => {
        it('dovrebbe avere il formato di risposta corretto', async () => {
            const mockSpaces = [{ space_id: 1, space_name: 'Test', location_name: 'Test Location', type_name: 'Test Type' }];
            db.query.mockResolvedValue({ rows: mockSpaces });

            await spaceController.getAllSpaces(req, res, next);

            const response = res.json.mock.calls[0][0];
            expect(response).toHaveProperty('status', 'success');
            expect(response).toHaveProperty('results', 1);
            expect(response).toHaveProperty('data');
            expect(response.data).toHaveProperty('spaces');
        });

        it('dovrebbe includere i dati joinati di location e space_type', async () => {
            const mockSpaces = [{
                space_id: 1,
                space_name: 'Test Space',
                location_name: 'Test Location',
                type_name: 'Test Type'
            }];
            db.query.mockResolvedValue({ rows: mockSpaces });

            await spaceController.getAllSpaces(req, res, next);

            const response = res.json.mock.calls[0][0];
            expect(response.data.spaces[0]).toHaveProperty('location_name');
            expect(response.data.spaces[0]).toHaveProperty('type_name');
        });
    });
});

describe('spaceController.getSpaceById', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                id: '1'
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Recupero spazio con successo', () => {
        it('dovrebbe restituire lo spazio corretto', async () => {
            const mockSpace = {
                space_id: 1,
                location_id: 1,
                space_type_id: 1,
                space_name: 'Ufficio Premium',
                description: 'Ufficio di lusso',
                capacity: 6,
                price_per_hour: 30.00,
                price_per_day: 240.00,
                location_name: 'Milano Centro',
                type_name: 'Ufficio'
            };

            db.query.mockResolvedValue({ rows: [mockSpace] });

            await spaceController.getSpaceById(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    space: mockSpace
                }
            });
        });

        it('dovrebbe chiamare db.query con la query corretta', async () => {
            const mockSpace = { space_id: 1, space_name: 'Test' };
            db.query.mockResolvedValue({ rows: [mockSpace] });

            await spaceController.getSpaceById(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                `
        SELECT s.*, l.location_name, st.type_name
        FROM spaces s
        JOIN locations l ON s.location_id = l.location_id
        JOIN space_types st ON s.space_type_id = st.space_type_id
        WHERE s.space_id = $1
    `,
                ['1']
            );
        });

        it('dovrebbe funzionare con diversi ID', async () => {
            const mockSpace = { space_id: 999, space_name: 'Test999' };
            req.params.id = '999';

            db.query.mockResolvedValue({ rows: [mockSpace] });

            await spaceController.getSpaceById(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE s.space_id = $1'),
                ['999']
            );
        });
    });

    describe('Spazio non trovato', () => {
        it('dovrebbe restituire errore 404 se lo spazio non esiste', async () => {
            db.query.mockResolvedValue({ rows: [] });

            await spaceController.getSpaceById(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Spazio non trovato'
            });
        });

        it('dovrebbe gestire ID inesistente', async () => {
            req.params.id = '99999';
            db.query.mockResolvedValue({ rows: [] });

            await spaceController.getSpaceById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore del database', async () => {
            const dbError = new Error('Database connection failed');
            db.query.mockRejectedValue(dbError);

            await spaceController.getSpaceById(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('dovrebbe gestire errori di join', async () => {
            const joinError = new Error('Invalid join operation');
            db.query.mockRejectedValue(joinError);

            await spaceController.getSpaceById(req, res, next);

            expect(next).toHaveBeenCalledWith(joinError);
        });
    });
});

describe('spaceController.createSpace', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {
                location_id: 1,
                space_type_id: 1,
                space_name: 'Nuovo Spazio',
                description: 'Descrizione del nuovo spazio',
                capacity: 8,
                price_per_hour: 35.00,
                price_per_day: 280.00
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Creazione spazio con successo', () => {
        it('dovrebbe creare un nuovo spazio', async () => {
            const newSpace = {
                space_id: 1,
                location_id: 1,
                space_type_id: 1,
                space_name: 'Nuovo Spazio',
                description: 'Descrizione del nuovo spazio',
                capacity: 8,
                price_per_hour: 35.00,
                price_per_day: 280.00
            };

            // Mock per validazione location_id
            db.query.mockResolvedValueOnce({ rows: [{ location_id: 1 }] });
            // Mock per validazione space_type_id
            db.query.mockResolvedValueOnce({ rows: [{ space_type_id: 1 }] });
            // Mock per inserimento
            db.query.mockResolvedValueOnce({ rows: [newSpace] });

            await spaceController.createSpace(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    space: newSpace
                }
            });
        });

        it('dovrebbe validare location_id prima dell\'inserimento', async () => {
            const newSpace = { space_id: 1, space_name: 'Test' };

            db.query.mockResolvedValueOnce({ rows: [{ location_id: 1 }] });
            db.query.mockResolvedValueOnce({ rows: [{ space_type_id: 1 }] });
            db.query.mockResolvedValueOnce({ rows: [newSpace] });

            await spaceController.createSpace(req, res, next);

            expect(db.query).toHaveBeenNthCalledWith(1,
                'SELECT 1 FROM locations WHERE location_id = $1',
                [1]
            );
        });

        it('dovrebbe validare space_type_id prima dell\'inserimento', async () => {
            const newSpace = { space_id: 1, space_name: 'Test' };

            db.query.mockResolvedValueOnce({ rows: [{ location_id: 1 }] });
            db.query.mockResolvedValueOnce({ rows: [{ space_type_id: 1 }] });
            db.query.mockResolvedValueOnce({ rows: [newSpace] });

            await spaceController.createSpace(req, res, next);

            expect(db.query).toHaveBeenNthCalledWith(2,
                'SELECT 1 FROM space_types WHERE space_type_id = $1',
                [1]
            );
        });

        it('dovrebbe chiamare db.query con parametri corretti per l\'inserimento', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ location_id: 1 }] });
            db.query.mockResolvedValueOnce({ rows: [{ space_type_id: 1 }] });
            db.query.mockResolvedValueOnce({ rows: [{ space_id: 1 }] });

            await spaceController.createSpace(req, res, next);

            expect(db.query).toHaveBeenNthCalledWith(3,
                `INSERT INTO spaces (location_id, space_type_id, space_name, description, capacity, price_per_hour, price_per_day)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [1, 1, 'Nuovo Spazio', 'Descrizione del nuovo spazio', 8, 35.00, 280.00]
            );
        });
    });

    describe('Validazione campi obbligatori', () => {
        it('dovrebbe restituire errore 400 se manca location_id', async () => {
            delete req.body.location_id;

            await spaceController.createSpace(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Location ID, Space Type ID, nome, capacità, prezzo orario e prezzo giornaliero sono obbligatori.'
            });
        });

        it('dovrebbe restituire errore 400 se manca space_type_id', async () => {
            delete req.body.space_type_id;

            await spaceController.createSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe restituire errore 400 se manca space_name', async () => {
            delete req.body.space_name;

            await spaceController.createSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe restituire errore 400 se manca capacity', async () => {
            delete req.body.capacity;

            await spaceController.createSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe restituire errore 400 se price_per_hour è undefined', async () => {
            delete req.body.price_per_hour;

            await spaceController.createSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe restituire errore 400 se price_per_day è undefined', async () => {
            delete req.body.price_per_day;

            await spaceController.createSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe accettare price_per_hour e price_per_day a 0', async () => {
            req.body.price_per_hour = 0;
            req.body.price_per_day = 0;

            const newSpace = { space_id: 1, space_name: 'Test' };

            db.query.mockResolvedValueOnce({ rows: [{ location_id: 1 }] });
            db.query.mockResolvedValueOnce({ rows: [{ space_type_id: 1 }] });
            db.query.mockResolvedValueOnce({ rows: [newSpace] });

            await spaceController.createSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('Validazione chiavi esterne', () => {
        it('dovrebbe restituire errore 400 se location_id non esiste', async () => {
            db.query.mockResolvedValueOnce({ rows: [] }); // location non trovata

            await spaceController.createSpace(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Location ID non valida.'
            });
        });

        it('dovrebbe restituire errore 400 se space_type_id non esiste', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ location_id: 1 }] }); // location trovata
            db.query.mockResolvedValueOnce({ rows: [] }); // space_type non trovato

            await spaceController.createSpace(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Space Type ID non valido.'
            });
        });

        it('dovrebbe procedere se entrambe le FK sono valide', async () => {
            const newSpace = { space_id: 1, space_name: 'Test' };

            db.query.mockResolvedValueOnce({ rows: [{ location_id: 1 }] });
            db.query.mockResolvedValueOnce({ rows: [{ space_type_id: 1 }] });
            db.query.mockResolvedValueOnce({ rows: [newSpace] });

            await spaceController.createSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore del database nella validazione location', async () => {
            const dbError = new Error('Database connection failed');
            db.query.mockRejectedValueOnce(dbError);

            await spaceController.createSpace(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('dovrebbe gestire errore del database nella validazione space_type', async () => {
            const dbError = new Error('Database connection failed');
            db.query.mockResolvedValueOnce({ rows: [{ location_id: 1 }] });
            db.query.mockRejectedValueOnce(dbError);

            await spaceController.createSpace(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });

        it('dovrebbe gestire errore del database nell\'inserimento', async () => {
            const dbError = new Error('Insert failed');
            db.query.mockResolvedValueOnce({ rows: [{ location_id: 1 }] });
            db.query.mockResolvedValueOnce({ rows: [{ space_type_id: 1 }] });
            db.query.mockRejectedValueOnce(dbError);

            await spaceController.createSpace(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });
    });

    describe('Casi edge', () => {
        it('dovrebbe gestire description null', async () => {
            req.body.description = null;
            const newSpace = { space_id: 1, description: null };

            db.query.mockResolvedValueOnce({ rows: [{ location_id: 1 }] });
            db.query.mockResolvedValueOnce({ rows: [{ space_type_id: 1 }] });
            db.query.mockResolvedValueOnce({ rows: [newSpace] });

            await spaceController.createSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('dovrebbe gestire valori numerici edge', async () => {
            req.body.capacity = 1;
            req.body.price_per_hour = 0.01;
            req.body.price_per_day = 999999.99;

            const newSpace = { space_id: 1, capacity: 1 };

            db.query.mockResolvedValueOnce({ rows: [{ location_id: 1 }] });
            db.query.mockResolvedValueOnce({ rows: [{ space_type_id: 1 }] });
            db.query.mockResolvedValueOnce({ rows: [newSpace] });

            await spaceController.createSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('dovrebbe gestire nomi con caratteri speciali', async () => {
            req.body.space_name = 'Spazio @#$% & Co.';
            req.body.description = 'Descrizione con àccènti';

            const newSpace = { space_id: 1, space_name: 'Spazio @#$% & Co.' };

            db.query.mockResolvedValueOnce({ rows: [{ location_id: 1 }] });
            db.query.mockResolvedValueOnce({ rows: [{ space_type_id: 1 }] });
            db.query.mockResolvedValueOnce({ rows: [newSpace] });

            await spaceController.createSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });
    });
});

describe('spaceController.updateSpace', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                id: '1'
            },
            body: {
                location_id: 2,
                space_type_id: 2,
                space_name: 'Spazio Aggiornato',
                description: 'Descrizione aggiornata',
                capacity: 10,
                price_per_hour: 40.00,
                price_per_day: 320.00
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Aggiornamento spazio con successo', () => {
        it('dovrebbe aggiornare tutti i campi dello spazio', async () => {
            const updatedSpace = {
                space_id: 1,
                location_id: 2,
                space_type_id: 2,
                space_name: 'Spazio Aggiornato',
                description: 'Descrizione aggiornata',
                capacity: 10,
                price_per_hour: 40.00,
                price_per_day: 320.00
            };

            // Mock per validazione location_id
            db.query.mockResolvedValueOnce({ rows: [{ location_id: 2 }] });
            // Mock per validazione space_type_id
            db.query.mockResolvedValueOnce({ rows: [{ space_type_id: 2 }] });
            // Mock per update
            db.query.mockResolvedValueOnce({ rows: [updatedSpace] });

            await spaceController.updateSpace(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    space: updatedSpace
                }
            });
        });

        it('dovrebbe aggiornare solo alcuni campi', async () => {
            const updatedSpace = {
                space_id: 1,
                space_name: 'Solo Nome Aggiornato',
                capacity: 12
            };

            req.body = {
                space_name: 'Solo Nome Aggiornato',
                capacity: 12
            };

            db.query.mockResolvedValueOnce({ rows: [updatedSpace] });

            await spaceController.updateSpace(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'UPDATE spaces SET space_name = $2, capacity = $3 WHERE space_id = $1 RETURNING *',
                ['1', 'Solo Nome Aggiornato', 12]
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('dovrebbe aggiornare solo location_id con validazione', async () => {
            const updatedSpace = { space_id: 1, location_id: 3 };

            req.body = { location_id: 3 };

            db.query.mockResolvedValueOnce({ rows: [{ location_id: 3 }] });
            db.query.mockResolvedValueOnce({ rows: [updatedSpace] });

            await spaceController.updateSpace(req, res, next);

            expect(db.query).toHaveBeenNthCalledWith(1,
                'SELECT 1 FROM locations WHERE location_id = $1',
                [3]
            );
            expect(db.query).toHaveBeenNthCalledWith(2,
                'UPDATE spaces SET location_id = $2 WHERE space_id = $1 RETURNING *',
                ['1', 3]
            );
        });

        it('dovrebbe aggiornare solo space_type_id con validazione', async () => {
            const updatedSpace = { space_id: 1, space_type_id: 4 };

            req.body = { space_type_id: 4 };

            db.query.mockResolvedValueOnce({ rows: [{ space_type_id: 4 }] });
            db.query.mockResolvedValueOnce({ rows: [updatedSpace] });

            await spaceController.updateSpace(req, res, next);

            expect(db.query).toHaveBeenNthCalledWith(1,
                'SELECT 1 FROM space_types WHERE space_type_id = $1',
                [4]
            );
        });

        it('dovrebbe gestire description undefined', async () => {
            const updatedSpace = { space_id: 1, space_name: 'Test' };

            req.body = {
                space_name: 'Test',
                description: undefined
            };

            db.query.mockResolvedValueOnce({ rows: [updatedSpace] });

            await spaceController.updateSpace(req, res, next);

            // description undefined non viene incluso nella query
            expect(db.query).toHaveBeenCalledWith(
                'UPDATE spaces SET space_name = $2 WHERE space_id = $1 RETURNING *',
                ['1', 'Test']
            );
        });

        it('dovrebbe gestire prezzi a 0', async () => {
            const updatedSpace = { space_id: 1, price_per_hour: 0, price_per_day: 0 };

            req.body = {
                price_per_hour: 0,
                price_per_day: 0
            };

            db.query.mockResolvedValueOnce({ rows: [updatedSpace] });

            await spaceController.updateSpace(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'UPDATE spaces SET price_per_hour = $2, price_per_day = $3 WHERE space_id = $1 RETURNING *',
                ['1', 0, 0]
            );
        });
    });

    describe('Validazione campi', () => {
        it('dovrebbe restituire errore 400 se non ci sono campi da aggiornare', async () => {
            req.body = {};

            await spaceController.updateSpace(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Nessun campo valido fornito per l\'aggiornamento.'
            });
        });

        it('dovrebbe ignorare campi vuoti stringa per campi non numerici', async () => {
            const updatedSpace = { space_id: 1 };

            req.body = {
                space_name: '',
                description: ''
            };

            db.query.mockResolvedValueOnce({ rows: [] }); // Nessun campo valido = nessun update

            await spaceController.updateSpace(req, res, next);

            // Campi vuoti vengono ignorati, quindi nessun campo valido = errore 400
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('dovrebbe ignorare campi null per campi non di prezzo', async () => {
            req.body = {
                space_name: null,
                location_id: null
            };

            await spaceController.updateSpace(req, res, next);

            // Campi null vengono ignorati, quindi nessun campo valido = errore 400
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('Validazione chiavi esterne', () => {
        it('dovrebbe restituire errore 400 se location_id non esiste', async () => {
            req.body = { location_id: 999 };

            db.query.mockResolvedValueOnce({ rows: [] }); // location non trovata

            await spaceController.updateSpace(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Location ID non valida.'
            });
        });

        it('dovrebbe restituire errore 400 se space_type_id non esiste', async () => {
            req.body = { space_type_id: 999 };

            db.query.mockResolvedValueOnce({ rows: [] }); // space_type non trovato

            await spaceController.updateSpace(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Space Type ID non valido.'
            });
        });

        it('dovrebbe validare entrambe le FK se presenti', async () => {
            req.body = {
                location_id: 2,
                space_type_id: 3
            };

            const updatedSpace = { space_id: 1, location_id: 2, space_type_id: 3 };

            db.query.mockResolvedValueOnce({ rows: [{ location_id: 2 }] });
            db.query.mockResolvedValueOnce({ rows: [{ space_type_id: 3 }] });
            db.query.mockResolvedValueOnce({ rows: [updatedSpace] });

            await spaceController.updateSpace(req, res, next);

            expect(db.query).toHaveBeenNthCalledWith(1,
                'SELECT 1 FROM locations WHERE location_id = $1',
                [2]
            );
            expect(db.query).toHaveBeenNthCalledWith(2,
                'SELECT 1 FROM space_types WHERE space_type_id = $1',
                [3]
            );
        });
    });

    describe('Spazio non trovato', () => {
        it('dovrebbe restituire errore 404 se lo spazio non esiste', async () => {
            req.body = { space_name: 'Test' };

            db.query.mockResolvedValueOnce({ rows: [] }); // update non trova lo spazio

            await spaceController.updateSpace(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Spazio non trovato'
            });
        });

        it('dovrebbe gestire ID inesistente', async () => {
            req.params.id = '99999';
            req.body = { space_name: 'Test' };

            db.query.mockResolvedValueOnce({ rows: [] });

            await spaceController.updateSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore del database nella validazione location', async () => {
            const dbError = new Error('Database connection failed');
            req.body = { location_id: 2 };

            db.query.mockRejectedValueOnce(dbError);

            await spaceController.updateSpace(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('dovrebbe gestire errore del database nell\'update', async () => {
            const dbError = new Error('Update failed');
            req.body = { space_name: 'Test' };

            db.query.mockRejectedValueOnce(dbError);

            await spaceController.updateSpace(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
        });

        it('dovrebbe gestire errore nell\'update dopo validazioni FK', async () => {
            const updateError = new Error('Update query failed');
            req.body = {
                location_id: 2,
                space_name: 'Test'
            };

            db.query.mockResolvedValueOnce({ rows: [{ location_id: 2 }] });
            db.query.mockRejectedValueOnce(updateError);

            await spaceController.updateSpace(req, res, next);

            expect(next).toHaveBeenCalledWith(updateError);
        });
    });

    describe('Costruzione query dinamica', () => {
        it('dovrebbe costruire query con tutti i campi', async () => {
            const updatedSpace = { space_id: 1 };

            db.query.mockResolvedValueOnce({ rows: [{ location_id: 2 }] });
            db.query.mockResolvedValueOnce({ rows: [{ space_type_id: 2 }] });
            db.query.mockResolvedValueOnce({ rows: [updatedSpace] });

            await spaceController.updateSpace(req, res, next);

            expect(db.query).toHaveBeenNthCalledWith(3,
                'UPDATE spaces SET location_id = $2, space_type_id = $3, space_name = $4, description = $5, capacity = $6, price_per_hour = $7, price_per_day = $8 WHERE space_id = $1 RETURNING *',
                ['1', 2, 2, 'Spazio Aggiornato', 'Descrizione aggiornata', 10, 40.00, 320.00]
            );
        });

        it('dovrebbe costruire query con ordine corretto dei parametri', async () => {
            const updatedSpace = { space_id: 1 };

            req.body = {
                price_per_day: 500,
                space_name: 'Nome',
                capacity: 5,
                price_per_hour: 25
            };

            db.query.mockResolvedValueOnce({ rows: [updatedSpace] });

            await spaceController.updateSpace(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'UPDATE spaces SET space_name = $2, capacity = $3, price_per_hour = $4, price_per_day = $5 WHERE space_id = $1 RETURNING *',
                ['1', 'Nome', 5, 25, 500]
            );
        });
    });

    describe('Casi edge', () => {
        it('dovrebbe gestire valori numerici estremi', async () => {
            const updatedSpace = { space_id: 1 };

            req.body = {
                capacity: 1,
                price_per_hour: 0.01,
                price_per_day: 999999.99
            };

            db.query.mockResolvedValueOnce({ rows: [updatedSpace] });

            await spaceController.updateSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('dovrebbe gestire caratteri speciali nei nomi', async () => {
            const updatedSpace = { space_id: 1 };

            req.body = {
                space_name: 'Spazio @#$% & Co.',
                description: 'Descrizione con àccènti'
            };

            db.query.mockResolvedValueOnce({ rows: [updatedSpace] });

            await spaceController.updateSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});

describe('spaceController.deleteSpace', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                id: '1'
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Eliminazione spazio con successo', () => {
        it('dovrebbe eliminare lo spazio', async () => {
            const deletedSpace = {
                space_id: 1,
                space_name: 'Spazio Eliminato',
                description: 'Descrizione eliminata'
            };

            db.query.mockResolvedValue({ rows: [deletedSpace] });

            await spaceController.deleteSpace(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: null
            });
        });

        it('dovrebbe chiamare db.query con parametri corretti', async () => {
            const deletedSpace = { space_id: 5, space_name: 'Test' };
            req.params.id = '5';

            db.query.mockResolvedValue({ rows: [deletedSpace] });

            await spaceController.deleteSpace(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'DELETE FROM spaces WHERE space_id = $1 RETURNING *',
                ['5']
            );
        });

        it('dovrebbe funzionare con diversi ID', async () => {
            const deletedSpace = { space_id: 999, space_name: 'Test999' };
            req.params.id = '999';

            db.query.mockResolvedValue({ rows: [deletedSpace] });

            await spaceController.deleteSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(204);
        });
    });

    describe('Spazio non trovato', () => {
        it('dovrebbe restituire errore 404 se lo spazio non esiste', async () => {
            db.query.mockResolvedValue({ rows: [] });

            await spaceController.deleteSpace(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Spazio non trovato'
            });
        });

        it('dovrebbe gestire ID inesistente', async () => {
            req.params.id = '99999';
            db.query.mockResolvedValue({ rows: [] });

            await spaceController.deleteSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore del database', async () => {
            const dbError = new Error('Database connection failed');
            db.query.mockRejectedValue(dbError);

            await spaceController.deleteSpace(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('dovrebbe gestire errori di foreign key constraint', async () => {
            const fkError = new Error('Foreign key constraint violation');
            fkError.code = '23503';
            db.query.mockRejectedValue(fkError);

            await spaceController.deleteSpace(req, res, next);

            expect(next).toHaveBeenCalledWith(fkError);
        });

        it('dovrebbe gestire errori di constraint check', async () => {
            const constraintError = new Error('Check constraint violation');
            constraintError.code = '23514';
            db.query.mockRejectedValue(constraintError);

            await spaceController.deleteSpace(req, res, next);

            expect(next).toHaveBeenCalledWith(constraintError);
        });
    });

    describe('Validazione parametri', () => {
        it('dovrebbe gestire ID come stringa', async () => {
            const deletedSpace = { space_id: 1, space_name: 'Test' };
            req.params.id = '1';

            db.query.mockResolvedValue({ rows: [deletedSpace] });

            await spaceController.deleteSpace(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'DELETE FROM spaces WHERE space_id = $1 RETURNING *',
                ['1']
            );
        });

        it('dovrebbe gestire ID numerici grandi', async () => {
            const deletedSpace = { space_id: 2147483647, space_name: 'Test' };
            req.params.id = '2147483647';

            db.query.mockResolvedValue({ rows: [deletedSpace] });

            await spaceController.deleteSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(204);
        });
    });

    describe('Formato risposta', () => {
        it('dovrebbe avere il formato di risposta corretto per eliminazione', async () => {
            const deletedSpace = { space_id: 1, space_name: 'Test' };
            db.query.mockResolvedValue({ rows: [deletedSpace] });

            await spaceController.deleteSpace(req, res, next);

            const response = res.json.mock.calls[0][0];
            expect(response).toHaveProperty('status', 'success');
            expect(response).toHaveProperty('data', null);
        });

        it('dovrebbe restituire status 204 per eliminazione riuscita', async () => {
            const deletedSpace = { space_id: 1, space_name: 'Test' };
            db.query.mockResolvedValue({ rows: [deletedSpace] });

            await spaceController.deleteSpace(req, res, next);

            expect(res.status).toHaveBeenCalledWith(204);
        });
    });
});