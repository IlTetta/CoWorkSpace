// test/utils/catchAsync.test.js
const catchAsync = require('../../src/backend/utils/catchAsync');

describe('catchSync', () => {

    let req, res, next;

    beforeEach(() => {
        req = {};
        res = {};
        next = jest.fn();
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

        // 3. Esegue il middleware e cattura l'errore
        await wrappedFn(req, res, next);

        // 4. Verifica che next sia stato chiamato con l'errore
        expect(next).toHaveBeenCalledWith(expect.any(Error));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Errore di test'
        }));
    });
});