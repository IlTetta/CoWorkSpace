// tests/controllers/locationController.test.js
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
const locationController = require('../../src/backend/controllers/locationController');


describe('locationController.getAllLocations', () => {
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

    describe('Recupero sedi senza filtri', () => {
        it('dovrebbe restituire tutte le sedi', async () => {
            const locations = [
                { location_id: 1, location_name: 'Sede A', city: 'Roma', address: 'Via Roma 1' },
                { location_id: 2, location_name: 'Sede B', city: 'Milano', address: 'Via Milano 1' },
                { location_id: 3, location_name: 'Sede C', city: 'Napoli', address: 'Via Napoli 1' }
            ];

            pool.query.mockResolvedValueOnce({ rows: locations });

            await locationController.getAllLocations(req, res, next);

            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM locations', []);
            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 3,
                data: {
                    locations
                }
            });
        });

        it('dovrebbe gestire risultati vuoti', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            await locationController.getAllLocations(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 0,
                data: {
                    locations: []
                }
            });
        });
    });

    describe('Recupero sedi con filtro città', () => {
        it('dovrebbe filtrare per città (case-insensitive)', async () => {
            const filteredLocations = [
                { location_id: 1, location_name: 'Sede A', city: 'Roma', address: 'Via Roma 1' }
            ];

            req.query.city = 'roma';
            pool.query.mockResolvedValueOnce({ rows: filteredLocations });

            await locationController.getAllLocations(req, res, next);

            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM locations WHERE city ILIKE $1', ['%roma%']);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 1,
                data: {
                    locations: filteredLocations
                }
            });
        });

        it('dovrebbe funzionare con filtro parziale', async () => {
            req.query.city = 'Mil';
            pool.query.mockResolvedValueOnce({ rows: [] });

            await locationController.getAllLocations(req, res, next);

            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM locations WHERE city ILIKE $1', ['%Mil%']);
        });

        it('dovrebbe gestire caratteri speciali nel filtro', async () => {
            req.query.city = "Sant'Antonio";
            pool.query.mockResolvedValueOnce({ rows: [] });

            await locationController.getAllLocations(req, res, next);

            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM locations WHERE city ILIKE $1', ["%Sant'Antonio%"]);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore del database', async () => {
            const dbError = new Error('Database connection failed');
            pool.query.mockRejectedValueOnce(dbError);

            await locationController.getAllLocations(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.status).not.toHaveBeenCalled();
        });
    });
});

describe('locationController.getAllLocationsAlphabetically', () => {
    let req, res, next;

    beforeEach(() => {
        req = {};
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Recupero sedi ordinate alfabeticamente', () => {
        it('dovrebbe restituire sedi ordinate per nome', async () => {
            const orderedLocations = [
                { location_id: 3, location_name: 'Sede A', city: 'Napoli' },
                { location_id: 1, location_name: 'Sede B', city: 'Roma' },
                { location_id: 2, location_name: 'Sede C', city: 'Milano' }
            ];

            pool.query.mockResolvedValueOnce({ rows: orderedLocations });

            await locationController.getAllLocationsAlphabetically(req, res, next);

            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM locations ORDER BY location_name ASC');
            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 3,
                data: {
                    locations: orderedLocations
                }
            });
        });

        it('dovrebbe gestire risultati vuoti', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            await locationController.getAllLocationsAlphabetically(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 0,
                data: {
                    locations: []
                }
            });
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore del database', async () => {
            const dbError = new Error('Database query failed');
            pool.query.mockRejectedValueOnce(dbError);

            await locationController.getAllLocationsAlphabetically(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.status).not.toHaveBeenCalled();
        });
    });
});

describe('locationController.getLocationById', () => {
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

    describe('Recupero sede con successo', () => {
        it('dovrebbe restituire la sede richiesta', async () => {
            const location = {
                location_id: 1,
                location_name: 'Sede Centrale',
                address: 'Via Roma 123',
                city: 'Roma',
                description: 'Sede principale',
                manager_id: 5
            };

            pool.query.mockResolvedValueOnce({ rows: [location] });

            await locationController.getLocationById(req, res, next);

            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM locations WHERE location_id = $1', ['1']);
            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    location
                }
            });
        });

        it('dovrebbe gestire ID diversi', async () => {
            const location = { location_id: 99, location_name: 'Test' };
            req.params.id = '99';

            pool.query.mockResolvedValueOnce({ rows: [location] });

            await locationController.getLocationById(req, res, next);

            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM locations WHERE location_id = $1', ['99']);
        });
    });

    describe('Sede non trovata', () => {
        it('dovrebbe restituire errore 404 se sede non esiste', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            await locationController.getLocationById(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Sede non trovata'
            });
        });

        it('dovrebbe gestire ID inesistente', async () => {
            req.params.id = '99999';
            pool.query.mockResolvedValueOnce({ rows: [] });

            await locationController.getLocationById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore del database', async () => {
            const dbError = new Error('Database connection failed');
            pool.query.mockRejectedValueOnce(dbError);

            await locationController.getLocationById(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.status).not.toHaveBeenCalled();
        });
    });
});

describe('locationController.createLocation', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {
                location_name: 'Nuova Sede',
                address: 'Via Nuova 123',
                city: 'Torino',
                description: 'Sede di test',
                manager_id: 3
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Creazione sede con successo', () => {
        it('dovrebbe creare una nuova sede con tutti i campi', async () => {
            const newLocation = {
                location_id: 4,
                location_name: 'Nuova Sede',
                address: 'Via Nuova 123',
                city: 'Torino',
                description: 'Sede di test',
                manager_id: 3
            };

            // Mock per validazione manager
            pool.query.mockResolvedValueOnce({ rows: [{ user_id: 3 }] });
            // Mock per inserimento
            pool.query.mockResolvedValueOnce({ rows: [newLocation] });

            await locationController.createLocation(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(1,
                'SELECT user_id FROM users WHERE user_id = $1 AND role = $2',
                [3, 'manager']
            );
            expect(pool.query).toHaveBeenNthCalledWith(2,
                `INSERT INTO locations (location_name, address, city, description, manager_id) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                ['Nuova Sede', 'Via Nuova 123', 'Torino', 'Sede di test', 3]
            );
            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    location: newLocation
                }
            });
        });

        it('dovrebbe creare sede senza manager_id', async () => {
            const newLocation = {
                location_id: 4,
                location_name: 'Nuova Sede',
                address: 'Via Nuova 123',
                city: 'Torino',
                description: 'Sede di test',
                manager_id: null
            };

            req.body.manager_id = undefined;

            pool.query.mockResolvedValueOnce({ rows: [newLocation] });

            await locationController.createLocation(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                `INSERT INTO locations (location_name, address, city, description, manager_id) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                ['Nuova Sede', 'Via Nuova 123', 'Torino', 'Sede di test', null]
            );
        });

        it('dovrebbe creare sede senza description', async () => {
            const newLocation = { location_id: 4, description: null };

            req.body.description = undefined;
            req.body.manager_id = undefined;

            pool.query.mockResolvedValueOnce({ rows: [newLocation] });

            await locationController.createLocation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('Validazione campi obbligatori', () => {
        it('dovrebbe restituire errore 400 se manca location_name', async () => {
            req.body.location_name = undefined;

            await locationController.createLocation(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Nome, indirizzo e città sono obbligatori'
            });
        });

        it('dovrebbe restituire errore 400 se manca address', async () => {
            req.body.address = undefined;

            await locationController.createLocation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe restituire errore 400 se manca city', async () => {
            req.body.city = undefined;

            await locationController.createLocation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe gestire valori null', async () => {
            req.body.location_name = null;
            req.body.address = null;
            req.body.city = null;

            await locationController.createLocation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe gestire stringhe vuote', async () => {
            req.body.location_name = '';
            req.body.address = '';
            req.body.city = '';

            await locationController.createLocation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('Validazione manager_id', () => {
        it('dovrebbe restituire errore 400 se manager_id non è valido', async () => {
            req.body.manager_id = 999;
            pool.query.mockResolvedValueOnce({ rows: [] }); // manager non trovato

            await locationController.createLocation(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'L\'ID del manager non è valido o non è un manager'
            });
        });

        it('dovrebbe restituire errore 400 se utente non è manager', async () => {
            req.body.manager_id = 5;
            pool.query.mockResolvedValueOnce({ rows: [] }); // utente non ha ruolo manager

            await locationController.createLocation(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'SELECT user_id FROM users WHERE user_id = $1 AND role = $2',
                [5, 'manager']
            );
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe validare manager_id nullo esplicitamente', async () => {
            const newLocation = { location_id: 4, manager_id: null };

            req.body.manager_id = null;

            pool.query.mockResolvedValueOnce({ rows: [newLocation] });

            await locationController.createLocation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore durante validazione manager', async () => {
            const dbError = new Error('Database connection failed');
            pool.query.mockRejectedValueOnce(dbError);

            await locationController.createLocation(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('dovrebbe gestire errore durante inserimento', async () => {
            const insertError = new Error('Insert failed');
            req.body.manager_id = undefined;

            pool.query.mockRejectedValueOnce(insertError);

            await locationController.createLocation(req, res, next);

            expect(next).toHaveBeenCalledWith(insertError);
        });
    });

    describe('Casi edge', () => {
        it('dovrebbe gestire caratteri speciali nei nomi', async () => {
            const newLocation = { location_id: 4 };

            req.body.location_name = 'Sede "Principale" & Co.';
            req.body.address = 'Via Sant\'Antonio, 123';
            req.body.city = 'L\'Aquila';
            req.body.manager_id = undefined;

            pool.query.mockResolvedValueOnce({ rows: [newLocation] });

            await locationController.createLocation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('dovrebbe gestire description molto lunga', async () => {
            const newLocation = { location_id: 4 };
            const longDescription = 'A'.repeat(1000);

            req.body.description = longDescription;
            req.body.manager_id = undefined;

            pool.query.mockResolvedValueOnce({ rows: [newLocation] });

            await locationController.createLocation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });
    });
});

describe('locationController.updateLocation', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                id: '1'
            },
            body: {
                location_name: 'Sede Aggiornata',
                address: 'Via Aggiornata 456',
                city: 'Napoli',
                description: 'Descrizione aggiornata',
                manager_id: 7
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Aggiornamento sede con successo', () => {
        it('dovrebbe aggiornare tutti i campi della sede', async () => {
            const updatedLocation = {
                location_id: 1,
                location_name: 'Sede Aggiornata',
                address: 'Via Aggiornata 456',
                city: 'Napoli',
                description: 'Descrizione aggiornata',
                manager_id: 7
            };

            // Mock per validazione manager
            pool.query.mockResolvedValueOnce({ rows: [{ user_id: 7 }] });
            // Mock per update
            pool.query.mockResolvedValueOnce({ rows: [updatedLocation] });

            await locationController.updateLocation(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(2,
                'UPDATE locations SET location_name = $2, address = $3, city = $4, description = $5, manager_id = $6 WHERE location_id = $1 RETURNING *',
                ['1', 'Sede Aggiornata', 'Via Aggiornata 456', 'Napoli', 'Descrizione aggiornata', 7]
            );
            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    location: updatedLocation
                }
            });
        });

        it('dovrebbe aggiornare solo alcuni campi', async () => {
            const updatedLocation = {
                location_id: 1,
                location_name: 'Solo Nome Aggiornato'
            };

            req.body = {
                location_name: 'Solo Nome Aggiornato'
            };

            pool.query.mockResolvedValueOnce({ rows: [updatedLocation] });

            await locationController.updateLocation(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'UPDATE locations SET location_name = $2 WHERE location_id = $1 RETURNING *',
                ['1', 'Solo Nome Aggiornato']
            );
        });

        it('dovrebbe aggiornare manager_id a null', async () => {
            const updatedLocation = { location_id: 1, manager_id: null };

            req.body = {
                manager_id: null
            };

            pool.query.mockResolvedValueOnce({ rows: [updatedLocation] });

            await locationController.updateLocation(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'UPDATE locations SET manager_id = $2 WHERE location_id = $1 RETURNING *',
                ['1', null]
            );
        });

        it('dovrebbe validare nuovo manager_id', async () => {
            const updatedLocation = { location_id: 1, manager_id: 8 };

            req.body = {
                manager_id: 8
            };

            pool.query.mockResolvedValueOnce({ rows: [{ user_id: 8 }] }); // validazione manager
            pool.query.mockResolvedValueOnce({ rows: [updatedLocation] }); // update

            await locationController.updateLocation(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(1,
                'SELECT user_id FROM users WHERE user_id = $1 AND role = $2',
                [8, 'manager']
            );
        });
    });

    describe('Validazione campi', () => {
        it('dovrebbe restituire errore 400 se non ci sono campi da aggiornare', async () => {
            req.body = {};

            await locationController.updateLocation(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Nessun campo valido fornito per l\'aggiornamento'
            });
        });

        it('dovrebbe ignorare campi vuoti stringa', async () => {
            req.body = {
                location_name: '',
                address: '',
                city: ''
            };

            await locationController.updateLocation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe ignorare campi null (eccetto manager_id)', async () => {
            req.body = {
                location_name: null,
                address: null,
                city: null
            };

            await locationController.updateLocation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('Validazione manager_id', () => {
        it('dovrebbe restituire errore 400 se manager_id non valido', async () => {
            req.body = { manager_id: 999 };

            pool.query.mockResolvedValueOnce({ rows: [] }); // manager non trovato

            await locationController.updateLocation(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'L\'ID del manager non è valido o non è un manager'
            });
        });

        it('non dovrebbe validare se manager_id è null', async () => {
            const updatedLocation = { location_id: 1, manager_id: null };

            req.body = { manager_id: null };

            pool.query.mockResolvedValueOnce({ rows: [updatedLocation] });

            await locationController.updateLocation(req, res, next);

            expect(pool.query).toHaveBeenCalledTimes(1); // solo update, non validazione
        });
    });

    describe('Sede non trovata', () => {
        it('dovrebbe restituire errore 404 se sede non esiste', async () => {
            req.body = { location_name: 'Test' };

            pool.query.mockResolvedValueOnce({ rows: [] }); // update non trova la sede

            await locationController.updateLocation(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Sede non trovata'
            });
        });

        it('dovrebbe gestire ID inesistente', async () => {
            req.params.id = '99999';
            req.body = { location_name: 'Test' };

            pool.query.mockResolvedValueOnce({ rows: [] });

            await locationController.updateLocation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore durante validazione manager', async () => {
            const dbError = new Error('Database connection failed');
            req.body = { manager_id: 5 };

            pool.query.mockRejectedValueOnce(dbError);

            await locationController.updateLocation(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('dovrebbe gestire errore durante update', async () => {
            const updateError = new Error('Update failed');
            req.body = { location_name: 'Test' };

            pool.query.mockRejectedValueOnce(updateError);

            await locationController.updateLocation(req, res, next);

            expect(next).toHaveBeenCalledWith(updateError);
        });
    });

    describe('Costruzione query dinamica', () => {
        it('dovrebbe costruire query con tutti i campi nell\'ordine corretto', async () => {
            const updatedLocation = { location_id: 1 };

            pool.query.mockResolvedValueOnce({ rows: [{ user_id: 7 }] }); // validazione manager
            pool.query.mockResolvedValueOnce({ rows: [updatedLocation] }); // update

            await locationController.updateLocation(req, res, next);

            expect(pool.query).toHaveBeenNthCalledWith(2,
                'UPDATE locations SET location_name = $2, address = $3, city = $4, description = $5, manager_id = $6 WHERE location_id = $1 RETURNING *',
                ['1', 'Sede Aggiornata', 'Via Aggiornata 456', 'Napoli', 'Descrizione aggiornata', 7]
            );
        });

        it('dovrebbe costruire query con ordine corretto dei parametri', async () => {
            const updatedLocation = { location_id: 1 };

            req.body = {
                city: 'Milano',
                location_name: 'Nome',
                address: 'Indirizzo'
            };

            pool.query.mockResolvedValueOnce({ rows: [updatedLocation] });

            await locationController.updateLocation(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'UPDATE locations SET location_name = $2, address = $3, city = $4 WHERE location_id = $1 RETURNING *',
                ['1', 'Nome', 'Indirizzo', 'Milano']
            );
        });
    });

    describe('Casi edge', () => {
        it('dovrebbe gestire caratteri speciali nei campi', async () => {
            const updatedLocation = { location_id: 1 };

            req.body = {
                location_name: 'Sede "Speciale" & Co.',
                address: 'Via Sant\'Antonio, 456',
                city: 'L\'Aquila'
            };

            pool.query.mockResolvedValueOnce({ rows: [updatedLocation] });

            await locationController.updateLocation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('dovrebbe gestire description undefined', async () => {
            const updatedLocation = { location_id: 1, description: null };

            req.body = {
                location_name: 'Test',
                description: undefined
            };

            pool.query.mockResolvedValueOnce({ rows: [updatedLocation] });

            await locationController.updateLocation(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'UPDATE locations SET location_name = $2 WHERE location_id = $1 RETURNING *',
                ['1', 'Test']
            );
        });
    });
});

describe('locationController.deleteLocation', () => {
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

    describe('Eliminazione sede con successo', () => {
        it('dovrebbe eliminare la sede', async () => {
            const deletedLocation = {
                location_id: 1,
                location_name: 'Sede Eliminata',
                address: 'Via Eliminata 123'
            };

            pool.query.mockResolvedValue({ rows: [deletedLocation] });

            await locationController.deleteLocation(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: null
            });
        });

        it('dovrebbe chiamare db.query con parametri corretti', async () => {
            const deletedLocation = { location_id: 5, location_name: 'Test' };
            req.params.id = '5';

            pool.query.mockResolvedValue({ rows: [deletedLocation] });

            await locationController.deleteLocation(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'DELETE FROM locations WHERE location_id = $1 RETURNING *',
                ['5']
            );
        });

        it('dovrebbe funzionare con diversi ID', async () => {
            const deletedLocation = { location_id: 999, location_name: 'Test999' };
            req.params.id = '999';

            pool.query.mockResolvedValue({ rows: [deletedLocation] });

            await locationController.deleteLocation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(204);
        });
    });

    describe('Sede non trovata', () => {
        it('dovrebbe restituire errore 404 se sede non esiste', async () => {
            pool.query.mockResolvedValue({ rows: [] });

            await locationController.deleteLocation(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Sede non trovata'
            });
        });

        it('dovrebbe gestire ID inesistente', async () => {
            req.params.id = '99999';
            pool.query.mockResolvedValue({ rows: [] });

            await locationController.deleteLocation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore del database', async () => {
            const dbError = new Error('Database connection failed');
            pool.query.mockRejectedValue(dbError);

            await locationController.deleteLocation(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('dovrebbe gestire errori di foreign key constraint', async () => {
            const fkError = new Error('Foreign key constraint violation');
            fkError.code = '23503';
            pool.query.mockRejectedValue(fkError);

            await locationController.deleteLocation(req, res, next);

            expect(next).toHaveBeenCalledWith(fkError);
        });

        it('dovrebbe gestire errori di constraint check', async () => {
            const constraintError = new Error('Check constraint violation');
            constraintError.code = '23514';
            pool.query.mockRejectedValue(constraintError);

            await locationController.deleteLocation(req, res, next);

            expect(next).toHaveBeenCalledWith(constraintError);
        });
    });

    describe('Validazione parametri', () => {
        it('dovrebbe gestire ID come stringa', async () => {
            const deletedLocation = { location_id: 1, location_name: 'Test' };
            req.params.id = '1';

            pool.query.mockResolvedValue({ rows: [deletedLocation] });

            await locationController.deleteLocation(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'DELETE FROM locations WHERE location_id = $1 RETURNING *',
                ['1']
            );
        });

        it('dovrebbe gestire ID numerici grandi', async () => {
            const deletedLocation = { location_id: 2147483647, location_name: 'Test' };
            req.params.id = '2147483647';

            pool.query.mockResolvedValue({ rows: [deletedLocation] });

            await locationController.deleteLocation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(204);
        });
    });

    describe('Formato risposta', () => {
        it('dovrebbe avere il formato di risposta corretto per eliminazione', async () => {
            const deletedLocation = { location_id: 1, location_name: 'Test' };
            pool.query.mockResolvedValue({ rows: [deletedLocation] });

            await locationController.deleteLocation(req, res, next);

            const response = res.json.mock.calls[0][0];
            expect(response).toHaveProperty('status', 'success');
            expect(response).toHaveProperty('data', null);
        });

        it('dovrebbe restituire status 204 per eliminazione riuscita', async () => {
            const deletedLocation = { location_id: 1, location_name: 'Test' };
            pool.query.mockResolvedValue({ rows: [deletedLocation] });

            await locationController.deleteLocation(req, res, next);

            expect(res.status).toHaveBeenCalledWith(204);
        });
    });
});