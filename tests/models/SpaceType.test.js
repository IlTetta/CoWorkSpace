// tests/models/SpaceType.test.js
const SpaceType = require('../../src/backend/models/SpaceType');
const pool = require('../../src/backend/config/db');

// Mock del pool di connessioni
jest.mock('../../src/backend/config/db', () => ({
    query: jest.fn()
}));

describe('SpaceType Model', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        test('dovrebbe restituire tutti i tipi di spazio', async () => {
            const mockSpaceTypes = [
                { space_type_id: 1, type_name: 'Ufficio', description: 'Spazio per ufficio' },
                { space_type_id: 2, type_name: 'Sala Riunioni', description: 'Spazio per riunioni' }
            ];
            
            pool.query.mockResolvedValue({ rows: mockSpaceTypes });

            const result = await SpaceType.findAll();

            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM space_types');
            expect(result).toEqual(mockSpaceTypes);
        });

        test('dovrebbe restituire array vuoto se non ci sono tipi di spazio', async () => {
            pool.query.mockResolvedValue({ rows: [] });

            const result = await SpaceType.findAll();

            expect(result).toEqual([]);
        });
    });

    describe('findById', () => {
        test('dovrebbe restituire il tipo di spazio per ID valido', async () => {
            const mockSpaceType = { space_type_id: 1, type_name: 'Ufficio', description: 'Spazio per ufficio' };
            
            pool.query.mockResolvedValue({ rows: [mockSpaceType] });

            const result = await SpaceType.findById(1);

            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM space_types WHERE space_type_id = $1', [1]);
            expect(result).toEqual(mockSpaceType);
        });

        test('dovrebbe restituire null se il tipo di spazio non esiste', async () => {
            pool.query.mockResolvedValue({ rows: [] });

            const result = await SpaceType.findById(999);

            expect(result).toBeNull();
        });
    });

    describe('findByName', () => {
        test('dovrebbe trovare tipo di spazio per nome', async () => {
            const mockSpaceType = { space_type_id: 1, type_name: 'Ufficio', description: 'Spazio per ufficio' };
            
            pool.query.mockResolvedValue({ rows: [mockSpaceType] });

            const result = await SpaceType.findByName('Ufficio');

            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM space_types WHERE type_name = $1', ['Ufficio']);
            expect(result).toEqual(mockSpaceType);
        });

        test('dovrebbe restituire null se il nome non esiste', async () => {
            pool.query.mockResolvedValue({ rows: [] });

            const result = await SpaceType.findByName('NonEsiste');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        test('dovrebbe creare un nuovo tipo di spazio', async () => {
            const spaceTypeData = { type_name: 'Laboratorio', description: 'Spazio per laboratorio' };
            const mockCreatedSpaceType = { space_type_id: 3, ...spaceTypeData };
            
            pool.query.mockResolvedValue({ rows: [mockCreatedSpaceType] });

            const result = await SpaceType.create(spaceTypeData);

            expect(pool.query).toHaveBeenCalledWith(
                'INSERT INTO space_types (type_name, description) VALUES ($1, $2) RETURNING *',
                [spaceTypeData.type_name, spaceTypeData.description]
            );
            expect(result).toEqual(mockCreatedSpaceType);
        });

        test('dovrebbe creare tipo di spazio senza descrizione', async () => {
            const spaceTypeData = { type_name: 'Coworking' };
            const mockCreatedSpaceType = { space_type_id: 4, type_name: 'Coworking', description: undefined };
            
            pool.query.mockResolvedValue({ rows: [mockCreatedSpaceType] });

            const result = await SpaceType.create(spaceTypeData);

            expect(pool.query).toHaveBeenCalledWith(
                'INSERT INTO space_types (type_name, description) VALUES ($1, $2) RETURNING *',
                ['Coworking', undefined]
            );
            expect(result).toEqual(mockCreatedSpaceType);
        });

        test('dovrebbe lanciare errore se manca type_name', async () => {
            await expect(SpaceType.create({})).rejects.toThrow('Il nome del tipo di spazio è obbligatorio');
            expect(pool.query).not.toHaveBeenCalled();
        });

        test('dovrebbe propagare errori del database', async () => {
            const dbError = new Error('Database error');
            dbError.code = '23505';
            pool.query.mockRejectedValue(dbError);

            await expect(SpaceType.create({ type_name: 'Test' })).rejects.toThrow('Database error');
        });
    });

    describe('update', () => {
        test('dovrebbe aggiornare tutti i campi', async () => {
            const updateData = { type_name: 'Nuovo Nome', description: 'Nuova descrizione' };
            const mockUpdatedSpaceType = { space_type_id: 1, ...updateData };
            
            pool.query.mockResolvedValue({ rows: [mockUpdatedSpaceType] });

            const result = await SpaceType.update(1, updateData);

            expect(pool.query).toHaveBeenCalledWith(
                'UPDATE space_types SET type_name = $2, description = $3 WHERE space_type_id = $1 RETURNING *',
                [1, updateData.type_name, updateData.description]
            );
            expect(result).toEqual(mockUpdatedSpaceType);
        });

        test('dovrebbe aggiornare solo il type_name', async () => {
            const updateData = { type_name: 'Solo Nome' };
            const mockUpdatedSpaceType = { space_type_id: 1, type_name: 'Solo Nome', description: 'Vecchia descrizione' };
            
            pool.query.mockResolvedValue({ rows: [mockUpdatedSpaceType] });

            const result = await SpaceType.update(1, updateData);

            expect(pool.query).toHaveBeenCalledWith(
                'UPDATE space_types SET type_name = $2 WHERE space_type_id = $1 RETURNING *',
                [1, updateData.type_name]
            );
        });

        test('dovrebbe ignorare campi vuoti', async () => {
            const updateData = { type_name: '', description: '' };
            const mockExistingSpaceType = { space_type_id: 1, type_name: 'Esistente', description: 'Esistente' };
            
            // Mock per findById
            pool.query.mockResolvedValue({ rows: [mockExistingSpaceType] });

            const result = await SpaceType.update(1, updateData);

            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM space_types WHERE space_type_id = $1', [1]);
            expect(result).toEqual(mockExistingSpaceType);
        });

        test('dovrebbe restituire null se il record non esiste', async () => {
            pool.query.mockResolvedValue({ rows: [] });

            const result = await SpaceType.update(999, { type_name: 'Test' });

            expect(result).toBeNull();
        });

        test('dovrebbe propagare errori del database', async () => {
            const dbError = new Error('Unique constraint violation');
            dbError.code = '23505';
            pool.query.mockRejectedValue(dbError);

            await expect(SpaceType.update(1, { type_name: 'Duplicato' })).rejects.toThrow('Unique constraint violation');
        });
    });

    describe('delete', () => {
        test('dovrebbe eliminare un tipo di spazio', async () => {
            const mockDeletedSpaceType = { space_type_id: 1, type_name: 'Eliminato', description: 'Da eliminare' };
            
            pool.query.mockResolvedValue({ rows: [mockDeletedSpaceType] });

            const result = await SpaceType.delete(1);

            expect(pool.query).toHaveBeenCalledWith('DELETE FROM space_types WHERE space_type_id = $1 RETURNING *', [1]);
            expect(result).toEqual(mockDeletedSpaceType);
        });

        test('dovrebbe restituire null se il record non esiste', async () => {
            pool.query.mockResolvedValue({ rows: [] });

            const result = await SpaceType.delete(999);

            expect(result).toBeNull();
        });
    });

    describe('exists', () => {
        test('dovrebbe restituire true se il tipo di spazio esiste', async () => {
            pool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

            const result = await SpaceType.exists(1);

            expect(pool.query).toHaveBeenCalledWith('SELECT 1 FROM space_types WHERE space_type_id = $1', [1]);
            expect(result).toBe(true);
        });

        test('dovrebbe restituire false se il tipo di spazio non esiste', async () => {
            pool.query.mockResolvedValue({ rows: [] });

            const result = await SpaceType.exists(999);

            expect(result).toBe(false);
        });
    });

    describe('count', () => {
        test('dovrebbe restituire il numero totale di tipi di spazio', async () => {
            pool.query.mockResolvedValue({ rows: [{ count: '5' }] });

            const result = await SpaceType.count();

            expect(pool.query).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM space_types');
            expect(result).toBe(5);
        });

        test('dovrebbe restituire 0 se non ci sono tipi di spazio', async () => {
            pool.query.mockResolvedValue({ rows: [{ count: '0' }] });

            const result = await SpaceType.count();

            expect(result).toBe(0);
        });
    });

    describe('search', () => {
        test('dovrebbe trovare tipi di spazio per termine di ricerca', async () => {
            const mockSpaceTypes = [
                { space_type_id: 1, type_name: 'Ufficio Privato', description: 'Spazio per ufficio' },
                { space_type_id: 2, type_name: 'Studio', description: 'Ufficio piccolo' }
            ];
            
            pool.query.mockResolvedValue({ rows: mockSpaceTypes });

            const result = await SpaceType.search('ufficio');

            expect(pool.query).toHaveBeenCalledWith(
                'SELECT * FROM space_types WHERE type_name ILIKE $1 OR description ILIKE $1 ORDER BY type_name',
                ['%ufficio%']
            );
            expect(result).toEqual(mockSpaceTypes);
        });

        test('dovrebbe restituire array vuoto se nessun risultato', async () => {
            pool.query.mockResolvedValue({ rows: [] });

            const result = await SpaceType.search('nessunrisultato');

            expect(result).toEqual([]);
        });
    });
});
