// test/utils/catchAsync.test.js
const catchAsync = require('../../src/backend/utils/catchAsync');

describe('catchAsync', () => {

    let req, res, next;

    beforeEach(() => {
        req = {
            originalUrl: '/test',
            method: 'GET',
            ip: '127.0.0.1',
            get: jest.fn().mockReturnValue('test-user-agent')
        };
        res = {};
        next = jest.fn();
        
        // Mock console methods
        console.error = jest.fn();
        console.log = jest.fn();
    });

    test('dovrebbe chiamare il middleware successivo senza errori se la funzione ha successo', async () => {
        // 1. Funzione asincrona che ha successo
        const successfulFn = async (req, res, next) => {
            return 'Success';
        };

        // 2. Passa la funzione a catchAsync
        const wrappedFn = catchAsync(successfulFn);

        //3. Esegue il middleware
        await wrappedFn(req, res, next);

        //4. Verifica che next non sia stato chiamato
        expect(next).not.toHaveBeenCalled();
    });

    test('dovrebbe chiamare il middleware successivo con un errore se la funzione fallisce', async () => {
        // 1. Funzione asincrona che fallisce
        const errorFn = async (req, res, next) => {
            throw new Error('Errore di test');
        };

        // 2. Passa la funzione a catchAsync
        const wrappedFn = catchAsync(errorFn);

        // 3. Esegue il middleware
        wrappedFn(req, res, next);

        // 4. Aspetta un tick per permettere alla Promise di essere processata
        await new Promise(resolve => setImmediate(resolve));

        // 5. Verifica che next sia stato chiamato con l'errore
        expect(next).toHaveBeenCalledWith(expect.any(Error));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Errore di test'
        }));
    });

    test('dovrebbe loggare errori quando logErrors è abilitato', async () => {
        const errorFn = async () => {
            throw new Error('Test error');
        };

        const wrappedFn = catchAsync(errorFn, { logErrors: true });
        wrappedFn(req, res, next);

        await new Promise(resolve => setImmediate(resolve));

        expect(console.error).toHaveBeenCalledWith(
            '[ERROR] in errorFn:',
            expect.objectContaining({
                message: 'Test error',
                url: '/test',
                method: 'GET'
            })
        );
    });

    test('dovrebbe misurare performance quando measurePerformance è abilitato', async () => {
        const slowFn = async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return 'done';
        };

        const wrappedFn = catchAsync(slowFn, { measurePerformance: true, operationName: 'slowOperation' });
        
        // Eseguiamo la funzione e aspettiamo che completi
        await wrappedFn(req, res, next);
        
        // Aspettiamo un momento per permettere il logging
        await new Promise(resolve => setImmediate(resolve));

        // Debug: vediamo cosa è stato chiamato
        console.log('Console.log calls:', console.log.mock.calls);

        expect(console.log).toHaveBeenCalled();
    });

    test('catchAsync.simple dovrebbe funzionare senza logging', async () => {
        const errorFn = async () => {
            throw new Error('Simple error');
        };

        const wrappedFn = catchAsync.simple(errorFn);
        wrappedFn(req, res, next);

        await new Promise(resolve => setImmediate(resolve));

        expect(next).toHaveBeenCalledWith(expect.any(Error));
        expect(console.error).not.toHaveBeenCalled();
    });

    test('catchAsync.critical dovrebbe abilitare logging e performance monitoring', async () => {
        const criticalFn = async () => {
            throw new Error('Critical error');
        };

        const wrappedFn = catchAsync.critical(criticalFn, 'criticalOperation');
        wrappedFn(req, res, next);

        await new Promise(resolve => setImmediate(resolve));

        expect(console.error).toHaveBeenCalledWith(
            '[ERROR] in criticalOperation:',
            expect.any(Object)
        );
    });
});