// tests/controllers/spaceTypeController.test.js
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
const spaceTypeController = require('../../src/backend/controllers/spaceTypeController');

describe('spaceTypeController.getAllSpaceTypes', () => {
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

    describe('Recupero tipi di spazio con successo', () => {
        it('dovrebbe restituire tutti i tipi di spazio', async () => {
            const mockSpaceTypes = [
                {
                    space_type_id: 1,
                    type_name: 'Ufficio',
                    description: 'Spazio per ufficio'
                },
                {
                    space_type_id: 2,
                    type_name: 'Sala riunioni',
                    description: 'Spazio per riunioni'
                }
            ];

            db.query.mockResolvedValue({ rows: mockSpaceTypes });

            await spaceTypeController.getAllSpaceTypes(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 2,
                data: {
                    spaceTypes: mockSpaceTypes
                }
            });
        });

        it('dovrebbe restituire un array vuoto se non ci sono tipi di spazio', async () => {
            db.query.mockResolvedValue({ rows: [] });

            await spaceTypeController.getAllSpaceTypes(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                results: 0,
                data: {
                    spaceTypes: []
                }
            });
        });

        it('dovrebbe chiamare db.query con la query corretta', async () => {
            db.query.mockResolvedValue({ rows: [] });

            await spaceTypeController.getAllSpaceTypes(req, res, next);

            expect(db.query).toHaveBeenCalledWith('SELECT * FROM space_types');
        });

        it('dovrebbe restituire il numero corretto di risultati', async () => {
            const mockSpaceTypes = Array.from({ length: 5 }, (_, i) => ({
                space_type_id: i + 1,
                type_name: `Tipo ${i + 1}`,
                description: `Descrizione ${i + 1}`
            }));

            db.query.mockResolvedValue({ rows: mockSpaceTypes });

            await spaceTypeController.getAllSpaceTypes(req, res, next);

            const response = res.json.mock.calls[0][0];
            expect(response.results).toBe(5);
            expect(response.data.spaceTypes).toHaveLength(5);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore del database', async () => {
            const dbError = new Error('Database connection failed');
            db.query.mockRejectedValue(dbError);

            await spaceTypeController.getAllSpaceTypes(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('dovrebbe gestire timeout del database', async () => {
            const timeoutError = new Error('Query timeout');
            timeoutError.code = 'ETIMEDOUT';
            db.query.mockRejectedValue(timeoutError);

            await spaceTypeController.getAllSpaceTypes(req, res, next);

            expect(next).toHaveBeenCalledWith(timeoutError);
        });
    });

    describe('Formato risposta', () => {
        it('dovrebbe avere il formato di risposta corretto', async () => {
            const mockSpaceTypes = [{ space_type_id: 1, type_name: 'Test', description: 'Test desc' }];
            db.query.mockResolvedValue({ rows: mockSpaceTypes });

            await spaceTypeController.getAllSpaceTypes(req, res, next);

            const response = res.json.mock.calls[0][0];
            expect(response).toHaveProperty('status', 'success');
            expect(response).toHaveProperty('results');
            expect(response).toHaveProperty('data');
            expect(response.data).toHaveProperty('spaceTypes');
        });
    });
});

describe('spaceTypeController.getSpaceTypeById', () => {
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

    describe('Recupero tipo di spazio con successo', () => {
        it('dovrebbe restituire il tipo di spazio corretto', async () => {
            const mockSpaceType = {
                space_type_id: 1,
                type_name: 'Ufficio',
                description: 'Spazio per ufficio'
            };

            db.query.mockResolvedValue({ rows: [mockSpaceType] });

            await spaceTypeController.getSpaceTypeById(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    spaceType: mockSpaceType
                }
            });
        });

        it('dovrebbe chiamare db.query con parametri corretti', async () => {
            const mockSpaceType = { space_type_id: 5, type_name: 'Test', description: 'Test' };
            req.params.id = '5';

            db.query.mockResolvedValue({ rows: [mockSpaceType] });

            await spaceTypeController.getSpaceTypeById(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'SELECT * FROM space_types WHERE space_type_id = $1',
                ['5']
            );
        });

        it('dovrebbe funzionare con diversi ID', async () => {
            const mockSpaceType = { space_type_id: 999, type_name: 'Test999', description: 'Test999' };
            req.params.id = '999';

            db.query.mockResolvedValue({ rows: [mockSpaceType] });

            await spaceTypeController.getSpaceTypeById(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    spaceType: mockSpaceType
                }
            });
        });
    });

    describe('Tipo di spazio non trovato', () => {
        it('dovrebbe restituire errore 404 se il tipo di spazio non esiste', async () => {
            db.query.mockResolvedValue({ rows: [] });

            await spaceTypeController.getSpaceTypeById(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Tipo di spazio non trovato'
            });
        });

        it('dovrebbe gestire ID non esistente', async () => {
            req.params.id = '99999';
            db.query.mockResolvedValue({ rows: [] });

            await spaceTypeController.getSpaceTypeById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore del database', async () => {
            const dbError = new Error('Database connection failed');
            db.query.mockRejectedValue(dbError);

            await spaceTypeController.getSpaceTypeById(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('dovrebbe gestire errore di constraint del database', async () => {
            const constraintError = new Error('Invalid input syntax for integer');
            constraintError.code = '22P02';
            db.query.mockRejectedValue(constraintError);

            await spaceTypeController.getSpaceTypeById(req, res, next);

            expect(next).toHaveBeenCalledWith(constraintError);
        });
    });

    describe('Validazione parametri', () => {
        it('dovrebbe gestire ID come stringa', async () => {
            const mockSpaceType = { space_type_id: 1, type_name: 'Test', description: 'Test' };
            req.params.id = '1';

            db.query.mockResolvedValue({ rows: [mockSpaceType] });

            await spaceTypeController.getSpaceTypeById(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'SELECT * FROM space_types WHERE space_type_id = $1',
                ['1']
            );
        });
    });
});

describe('spaceTypeController.createSpaceType', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {
                type_name: 'Nuovo Tipo',
                description: 'Descrizione del nuovo tipo'
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Creazione tipo di spazio con successo', () => {
        it('dovrebbe creare un nuovo tipo di spazio', async () => {
            const newSpaceType = {
                space_type_id: 1,
                type_name: 'Nuovo Tipo',
                description: 'Descrizione del nuovo tipo'
            };

            db.query.mockResolvedValue({ rows: [newSpaceType] });

            await spaceTypeController.createSpaceType(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    spaceType: newSpaceType
                }
            });
        });

        it('dovrebbe chiamare db.query con parametri corretti', async () => {
            const newSpaceType = { space_type_id: 1, type_name: 'Test', description: 'Test desc' };
            
            req.body = {
                type_name: 'Test',
                description: 'Test desc'
            };

            db.query.mockResolvedValue({ rows: [newSpaceType] });

            await spaceTypeController.createSpaceType(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'INSERT INTO space_types (type_name, description) VALUES ($1, $2) RETURNING *',
                ['Test', 'Test desc']
            );
        });

        it('dovrebbe creare tipo di spazio senza descrizione', async () => {
            const newSpaceType = {
                space_type_id: 1,
                type_name: 'Solo Nome',
                description: null
            };

            req.body = {
                type_name: 'Solo Nome'
            };

            db.query.mockResolvedValue({ rows: [newSpaceType] });

            await spaceTypeController.createSpaceType(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'INSERT INTO space_types (type_name, description) VALUES ($1, $2) RETURNING *',
                ['Solo Nome', undefined]
            );
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('dovrebbe gestire descrizione vuota', async () => {
            const newSpaceType = {
                space_type_id: 1,
                type_name: 'Nome',
                description: ''
            };

            req.body = {
                type_name: 'Nome',
                description: ''
            };

            db.query.mockResolvedValue({ rows: [newSpaceType] });

            await spaceTypeController.createSpaceType(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('Validazione campi obbligatori', () => {
        it('dovrebbe restituire errore 400 se manca type_name', async () => {
            req.body.type_name = '';

            await spaceTypeController.createSpaceType(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Il nome del tipo di spazio è obbligatorio'
            });
            expect(db.query).not.toHaveBeenCalled();
        });

        it('dovrebbe restituire errore se type_name è null', async () => {
            req.body.type_name = null;

            await spaceTypeController.createSpaceType(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(db.query).not.toHaveBeenCalled();
        });

        it('dovrebbe restituire errore se type_name è undefined', async () => {
            delete req.body.type_name;

            await spaceTypeController.createSpaceType(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(db.query).not.toHaveBeenCalled();
        });

        it('dovrebbe accettare solo type_name senza description', async () => {
            const newSpaceType = {
                space_type_id: 1,
                type_name: 'Solo Nome',
                description: null
            };

            req.body = { type_name: 'Solo Nome' };

            db.query.mockResolvedValue({ rows: [newSpaceType] });

            await spaceTypeController.createSpaceType(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('Gestione errori di unicità', () => {
        it('dovrebbe restituire errore 409 se il nome esiste già', async () => {
            const uniqueError = new Error('duplicate key value violates unique constraint');
            uniqueError.code = '23505';

            db.query.mockRejectedValue(uniqueError);

            await spaceTypeController.createSpaceType(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Un tipo di spazio con questo nome esiste già.'
            });
        });

        it('dovrebbe gestire conflitto di nomi case-insensitive', async () => {
            const uniqueError = new Error('Key (type_name)=(UFFICIO) already exists');
            uniqueError.code = '23505';

            req.body.type_name = 'UFFICIO';
            db.query.mockRejectedValue(uniqueError);

            await spaceTypeController.createSpaceType(req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
        });
    });

    describe('Gestione altri errori', () => {
        it('dovrebbe passare errori generici al middleware next', async () => {
            const genericError = new Error('Database connection failed');
            db.query.mockRejectedValue(genericError);

            await spaceTypeController.createSpaceType(req, res, next);

            expect(next).toHaveBeenCalledWith(genericError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('dovrebbe gestire errori di constraint check', async () => {
            const constraintError = new Error('Check constraint violation');
            constraintError.code = '23514';
            db.query.mockRejectedValue(constraintError);

            await spaceTypeController.createSpaceType(req, res, next);

            expect(next).toHaveBeenCalledWith(constraintError);
        });
    });

    describe('Casi edge', () => {
        it('dovrebbe gestire type_name con caratteri speciali', async () => {
            const newSpaceType = {
                space_type_id: 1,
                type_name: 'Spazio @#$%',
                description: 'Descrizione speciale'
            };

            req.body = {
                type_name: 'Spazio @#$%',
                description: 'Descrizione speciale'
            };

            db.query.mockResolvedValue({ rows: [newSpaceType] });

            await spaceTypeController.createSpaceType(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('dovrebbe gestire stringhe molto lunghe', async () => {
            const longName = 'A'.repeat(255);
            const newSpaceType = {
                space_type_id: 1,
                type_name: longName,
                description: 'Descrizione'
            };

            req.body = {
                type_name: longName,
                description: 'Descrizione'
            };

            db.query.mockResolvedValue({ rows: [newSpaceType] });

            await spaceTypeController.createSpaceType(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('dovrebbe gestire caratteri unicode', async () => {
            const newSpaceType = {
                space_type_id: 1,
                type_name: 'Spazio ñáéíóú',
                description: 'Descrizione con àccènti'
            };

            req.body = {
                type_name: 'Spazio ñáéíóú',
                description: 'Descrizione con àccènti'
            };

            db.query.mockResolvedValue({ rows: [newSpaceType] });

            await spaceTypeController.createSpaceType(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
        });
    });
});

describe('spaceTypeController.updateSpaceType', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                id: '1'
            },
            body: {
                type_name: 'Nome Aggiornato',
                description: 'Descrizione aggiornata'
            }
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('Aggiornamento tipo di spazio con successo', () => {
        it('dovrebbe aggiornare tutti i campi', async () => {
            const updatedSpaceType = {
                space_type_id: 1,
                type_name: 'Nome Aggiornato',
                description: 'Descrizione aggiornata'
            };

            db.query.mockResolvedValue({ rows: [updatedSpaceType] });

            await spaceTypeController.updateSpaceType(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: {
                    spaceType: updatedSpaceType
                }
            });
        });

        it('dovrebbe aggiornare solo il type_name', async () => {
            const updatedSpaceType = {
                space_type_id: 1,
                type_name: 'Solo Nome',
                description: 'Vecchia descrizione'
            };

            req.body = { type_name: 'Solo Nome' };

            db.query.mockResolvedValue({ rows: [updatedSpaceType] });

            await spaceTypeController.updateSpaceType(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'UPDATE space_types SET type_name = $2 WHERE space_type_id = $1 RETURNING *',
                ['1', 'Solo Nome']
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('dovrebbe aggiornare solo la description', async () => {
            const updatedSpaceType = {
                space_type_id: 1,
                type_name: 'Vecchio Nome',
                description: 'Nuova Descrizione'
            };

            req.body = { description: 'Nuova Descrizione' };

            db.query.mockResolvedValue({ rows: [updatedSpaceType] });

            await spaceTypeController.updateSpaceType(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'UPDATE space_types SET description = $2 WHERE space_type_id = $1 RETURNING *',
                ['1', 'Nuova Descrizione']
            );
        });

        it('dovrebbe costruire query dinamica correttamente', async () => {
            const updatedSpaceType = {
                space_type_id: 1,
                type_name: 'Nome Test',
                description: 'Desc Test'
            };

            req.body = {
                type_name: 'Nome Test',
                description: 'Desc Test'
            };

            db.query.mockResolvedValue({ rows: [updatedSpaceType] });

            await spaceTypeController.updateSpaceType(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'UPDATE space_types SET type_name = $2, description = $3 WHERE space_type_id = $1 RETURNING *',
                ['1', 'Nome Test', 'Desc Test']
            );
        });
    });

    describe('Validazione campi', () => {
        it('dovrebbe restituire errore 400 se non ci sono campi da aggiornare', async () => {
            req.body = {};

            await spaceTypeController.updateSpaceType(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Nessun campo valido fornito per l\'aggiornamento'
            });
            expect(db.query).not.toHaveBeenCalled();
        });

        it('dovrebbe ignorare campi vuoti', async () => {
            req.body = {
                type_name: '',
                description: ''
            };

            await spaceTypeController.updateSpaceType(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(db.query).not.toHaveBeenCalled();
        });

        it('dovrebbe ignorare campi null', async () => {
            req.body = {
                type_name: null,
                description: null
            };

            await spaceTypeController.updateSpaceType(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('dovrebbe ignorare campi undefined', async () => {
            req.body = {
                type_name: undefined,
                description: undefined
            };

            await spaceTypeController.updateSpaceType(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('Tipo di spazio non trovato', () => {
        it('dovrebbe restituire errore 404 se il tipo di spazio non esiste', async () => {
            db.query.mockResolvedValue({ rows: [] });

            await spaceTypeController.updateSpaceType(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Tipo di spazio non trovato'
            });
        });

        it('dovrebbe gestire ID inesistente', async () => {
            req.params.id = '99999';
            db.query.mockResolvedValue({ rows: [] });

            await spaceTypeController.updateSpaceType(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('Gestione errori di unicità', () => {
        it('dovrebbe restituire errore 409 se il nome esiste già', async () => {
            const uniqueError = new Error('duplicate key value violates unique constraint');
            uniqueError.code = '23505';

            db.query.mockRejectedValue(uniqueError);

            await spaceTypeController.updateSpaceType(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Un tipo di spazio con questo nome esiste già.'
            });
        });
    });

    describe('Gestione altri errori', () => {
        it('dovrebbe passare errori generici al middleware next', async () => {
            const genericError = new Error('Database connection failed');
            db.query.mockRejectedValue(genericError);

            await spaceTypeController.updateSpaceType(req, res, next);

            expect(next).toHaveBeenCalledWith(genericError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('dovrebbe gestire errori di constraint', async () => {
            const constraintError = new Error('Check constraint violation');
            constraintError.code = '23514';
            db.query.mockRejectedValue(constraintError);

            await spaceTypeController.updateSpaceType(req, res, next);

            expect(next).toHaveBeenCalledWith(constraintError);
        });
    });

    describe('Casi edge', () => {
        it('dovrebbe gestire aggiornamento con caratteri speciali', async () => {
            const updatedSpaceType = {
                space_type_id: 1,
                type_name: 'Nome @#$%',
                description: 'Desc @#$%'
            };

            req.body = {
                type_name: 'Nome @#$%',
                description: 'Desc @#$%'
            };

            db.query.mockResolvedValue({ rows: [updatedSpaceType] });

            await spaceTypeController.updateSpaceType(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('dovrebbe gestire aggiornamento con stringhe lunghe', async () => {
            const longName = 'B'.repeat(255);
            const updatedSpaceType = {
                space_type_id: 1,
                type_name: longName,
                description: 'Desc'
            };

            req.body = { type_name: longName };

            db.query.mockResolvedValue({ rows: [updatedSpaceType] });

            await spaceTypeController.updateSpaceType(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});

describe('spaceTypeController.deleteSpaceType', () => {
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

    describe('Eliminazione tipo di spazio con successo', () => {
        it('dovrebbe eliminare il tipo di spazio', async () => {
            const deletedSpaceType = {
                space_type_id: 1,
                type_name: 'Tipo Eliminato',
                description: 'Descrizione eliminata'
            };

            db.query.mockResolvedValue({ rows: [deletedSpaceType] });

            await spaceTypeController.deleteSpaceType(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: null
            });
        });

        it('dovrebbe chiamare db.query con parametri corretti', async () => {
            const deletedSpaceType = { space_type_id: 5, type_name: 'Test', description: 'Test' };
            req.params.id = '5';

            db.query.mockResolvedValue({ rows: [deletedSpaceType] });

            await spaceTypeController.deleteSpaceType(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'DELETE FROM space_types WHERE space_type_id = $1 RETURNING *',
                ['5']
            );
        });

        it('dovrebbe funzionare con diversi ID', async () => {
            const deletedSpaceType = { space_type_id: 999, type_name: 'Test999', description: 'Test999' };
            req.params.id = '999';

            db.query.mockResolvedValue({ rows: [deletedSpaceType] });

            await spaceTypeController.deleteSpaceType(req, res, next);

            expect(res.status).toHaveBeenCalledWith(204);
        });
    });

    describe('Tipo di spazio non trovato', () => {
        it('dovrebbe restituire errore 404 se il tipo di spazio non esiste', async () => {
            db.query.mockResolvedValue({ rows: [] });

            await spaceTypeController.deleteSpaceType(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                status: 'fail',
                message: 'Tipo di spazio non trovato'
            });
        });

        it('dovrebbe gestire ID inesistente', async () => {
            req.params.id = '99999';
            db.query.mockResolvedValue({ rows: [] });

            await spaceTypeController.deleteSpaceType(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('Gestione errori', () => {
        it('dovrebbe gestire errore del database', async () => {
            const dbError = new Error('Database connection failed');
            db.query.mockRejectedValue(dbError);

            await spaceTypeController.deleteSpaceType(req, res, next);

            expect(next).toHaveBeenCalledWith(dbError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('dovrebbe gestire errori di foreign key constraint', async () => {
            const fkError = new Error('Foreign key constraint violation');
            fkError.code = '23503';
            db.query.mockRejectedValue(fkError);

            await spaceTypeController.deleteSpaceType(req, res, next);

            expect(next).toHaveBeenCalledWith(fkError);
        });

        it('dovrebbe gestire errori di constraint check', async () => {
            const constraintError = new Error('Check constraint violation');
            constraintError.code = '23514';
            db.query.mockRejectedValue(constraintError);

            await spaceTypeController.deleteSpaceType(req, res, next);

            expect(next).toHaveBeenCalledWith(constraintError);
        });
    });

    describe('Validazione parametri', () => {
        it('dovrebbe gestire ID come stringa', async () => {
            const deletedSpaceType = { space_type_id: 1, type_name: 'Test', description: 'Test' };
            req.params.id = '1';

            db.query.mockResolvedValue({ rows: [deletedSpaceType] });

            await spaceTypeController.deleteSpaceType(req, res, next);

            expect(db.query).toHaveBeenCalledWith(
                'DELETE FROM space_types WHERE space_type_id = $1 RETURNING *',
                ['1']
            );
        });

        it('dovrebbe gestire ID numerici grandi', async () => {
            const deletedSpaceType = { space_type_id: 2147483647, type_name: 'Test', description: 'Test' };
            req.params.id = '2147483647';

            db.query.mockResolvedValue({ rows: [deletedSpaceType] });

            await spaceTypeController.deleteSpaceType(req, res, next);

            expect(res.status).toHaveBeenCalledWith(204);
        });
    });

    describe('Formato risposta', () => {
        it('dovrebbe avere il formato di risposta corretto per eliminazione', async () => {
            const deletedSpaceType = { space_type_id: 1, type_name: 'Test', description: 'Test' };
            db.query.mockResolvedValue({ rows: [deletedSpaceType] });

            await spaceTypeController.deleteSpaceType(req, res, next);

            const response = res.json.mock.calls[0][0];
            expect(response).toHaveProperty('status', 'success');
            expect(response).toHaveProperty('data', null);
        });

        it('dovrebbe restituire status 204 per eliminazione riuscita', async () => {
            const deletedSpaceType = { space_type_id: 1, type_name: 'Test', description: 'Test' };
            db.query.mockResolvedValue({ rows: [deletedSpaceType] });

            await spaceTypeController.deleteSpaceType(req, res, next);

            expect(res.status).toHaveBeenCalledWith(204);
        });
    });
});