const catchAsync = require('../../src/backend/utils/catchAsync');

describe('catchAsync', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Funzionalità base', () => {
    test('dovrebbe restituire una funzione', () => {
      const mockFn = jest.fn();
      const wrappedFn = catchAsync(mockFn);
      
      expect(typeof wrappedFn).toBe('function');
    });

    test('dovrebbe chiamare la funzione originale con i parametri corretti', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = catchAsync(mockFn);
      
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Gestione funzioni async/await', () => {
    test('dovrebbe gestire funzioni async che si risolvono correttamente', async () => {
      const mockAsyncFn = jest.fn(async (req, res, next) => {
        res.json({ success: true });
      });
      
      const wrappedFn = catchAsync(mockAsyncFn);
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockAsyncFn).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('dovrebbe catturare errori da funzioni async e chiamare next', async () => {
      const error = new Error('Errore async');
      const mockAsyncFn = jest.fn(async () => {
        throw error;
      });
      
      const wrappedFn = catchAsync(mockAsyncFn);
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    test('dovrebbe gestire Promise rejections', async () => {
      const error = new Error('Promise rejected');
      const mockAsyncFn = jest.fn(() => Promise.reject(error));
      
      const wrappedFn = catchAsync(mockAsyncFn);
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('Gestione Promise', () => {
    test('dovrebbe gestire Promise che si risolvono', async () => {
      const mockPromiseFn = jest.fn((req, res, next) => {
        return Promise.resolve().then(() => {
          res.json({ data: 'test' });
        });
      });
      
      const wrappedFn = catchAsync(mockPromiseFn);
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledWith({ data: 'test' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('dovrebbe catturare errori da Promise chain', async () => {
      const error = new Error('Promise chain error');
      const mockPromiseFn = jest.fn(() => {
        return Promise.resolve().then(() => {
          throw error;
        });
      });
      
      const wrappedFn = catchAsync(mockPromiseFn);
      
      // Aspettiamo che la Promise si risolva/rigetti
      await new Promise(resolve => setTimeout(resolve, 0));
      wrappedFn(mockReq, mockRes, mockNext);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('Gestione funzioni sincrone', () => {
    test('dovrebbe gestire funzioni sincrone che non restituiscono Promise', async () => {
      const mockSyncFn = jest.fn((req, res, next) => {
        res.json({ sync: true });
      });
      
      const wrappedFn = catchAsync(mockSyncFn);
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledWith({ sync: true });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('dovrebbe gestire funzioni sincrone che restituiscono valori', async () => {
      const mockSyncFn = jest.fn(() => 'return value');
      
      const wrappedFn = catchAsync(mockSyncFn);
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockSyncFn).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('dovrebbe documentare che gli errori sincroni non sono gestiti', () => {
      // Questo test documenta il comportamento: catchAsync NON gestisce errori sincroni
      // È progettato solo per funzioni async o funzioni che ritornano Promise
      const syncErrorFn = catchAsync((req, res, next) => {
        throw new Error('Sync error - non gestito');
      });
      
      // Questo test verifica che capiamo il comportamento della funzione
      expect(() => {
        syncErrorFn(mockReq, mockRes, mockNext);
      }).toThrow('Sync error - non gestito');
      
      // Il next middleware non viene chiamato perché l'errore non è catturato
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Tipi di errore', () => {
    test('dovrebbe gestire errori personalizzati', async () => {
      class CustomError extends Error {
        constructor(message, statusCode) {
          super(message);
          this.statusCode = statusCode;
        }
      }
      
      const customError = new CustomError('Custom error', 400);
      const mockFn = jest.fn(async () => {
        throw customError;
      });
      
      const wrappedFn = catchAsync(mockFn);
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(customError);
      expect(mockNext.mock.calls[0][0]).toBeInstanceOf(CustomError);
      expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
    });

    test('dovrebbe gestire stringhe come errori', async () => {
      const stringError = 'String error message';
      const mockFn = jest.fn(async () => {
        throw stringError;
      });
      
      const wrappedFn = catchAsync(mockFn);
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(stringError);
    });

    test('dovrebbe gestire null/undefined come errori', async () => {
      const mockFn = jest.fn(async () => {
        throw null;
      });
      
      const wrappedFn = catchAsync(mockFn);
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(null);
    });
  });

  describe('Casi limite e edge cases', () => {
    test('dovrebbe gestire funzioni che restituiscono undefined', async () => {
      const mockFn = jest.fn(() => undefined);
      
      const wrappedFn = catchAsync(mockFn);
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('dovrebbe gestire funzioni che restituiscono null', async () => {
      const mockFn = jest.fn(() => null);
      
      const wrappedFn = catchAsync(mockFn);
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('dovrebbe gestire multiple chiamate consecutive', async () => {
      let callCount = 0;
      const mockFn = jest.fn(async (req, res, next) => {
        callCount++;
        if (callCount === 1) {
          res.json({ call: 1 });
        } else {
          throw new Error(`Call ${callCount}`);
        }
      });
      
      const wrappedFn = catchAsync(mockFn);
      
      // Prima chiamata - successo
      await wrappedFn(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalledWith({ call: 1 });
      expect(mockNext).not.toHaveBeenCalled();
      
      // Reset mocks per seconda chiamata
      jest.clearAllMocks();
      
      // Seconda chiamata - errore
      await wrappedFn(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Call 2'
      }));
    });

    test('dovrebbe preservare il contesto di this', async () => {
      const context = {
        value: 'test context',
        testMethod: function(req, res, next) {
          return Promise.resolve().then(() => {
            res.json({ context: this.value });
          });
        }
      };
      
      // Wrap the method with catchAsync
      context.testMethod = catchAsync(context.testMethod.bind(context));
      
      await context.testMethod(mockReq, mockRes, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledWith({ context: 'test context' });
    });
  });

  describe('Integrazione con Express middleware pattern', () => {
    test('dovrebbe simulare un controller tipico di Express', async () => {
      // Simula un controller semplice senza setTimeout per evitare problemi di timing
      const mockController = catchAsync(async (req, res, next) => {
        // Simula operazione asincrona semplice
        const data = { id: 1, name: 'Test' };
        
        res.status(200).json({
          success: true,
          data
        });
      });
      
      await mockController(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 1, name: 'Test' }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('dovrebbe simulare un controller che fallisce', async () => {
      // Simula un controller che fallisce senza setTimeout
      const dbError = new Error('Database connection failed');
      const mockController = catchAsync(async (req, res, next) => {
        // Simula operazione asincrona che fallisce immediatamente
        throw dbError;
      });
      
      await mockController(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(dbError);
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Performance e comportamento', () => {
    test('non dovrebbe introdurre ritardi significativi', async () => {
      const startTime = Date.now();
      const mockFn = jest.fn(async () => {
        // Simula operazione veloce
        await new Promise(resolve => setTimeout(resolve, 1));
      });
      
      const wrappedFn = catchAsync(mockFn);
      await wrappedFn(mockReq, mockRes, mockNext);
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(50); // Margine generoso
    });

    test('dovrebbe gestire errori in modo asincrono', async () => {
      const error = new Error('Async error handling test');
      const mockFn = jest.fn(async () => {
        throw error;
      });
      
      const wrappedFn = catchAsync(mockFn);
      
      // Eseguiamo la funzione e aspettiamo che termini
      await wrappedFn(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
