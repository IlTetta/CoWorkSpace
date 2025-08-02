import { describe, it, expect, vi } from 'vitest';
import catchAsync from '../../backend/utils/catchAsync';

describe('catchAsync', () => {
  it('esegue la funzione async correttamente', async () => {
    const req = {};
    const res = {};
    const next = vi.fn();

    const asyncMiddleware = vi.fn(async (req, res, next) => {
      // simulazione async
      return 'ok';
    });

    const wrapped = catchAsync(asyncMiddleware);

    await wrapped(req, res, next);

    expect(asyncMiddleware).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled(); // nessun errore
  });

  it('cattura errori e li passa a next', async () => {
    const req = {};
    const res = {};
    const next = vi.fn();

    const error = new Error('Test error');

    const asyncMiddleware = vi.fn(async (req, res, next) => {
      throw error;
    });

    const wrapped = catchAsync(asyncMiddleware);

    await wrapped(req, res, next);

    expect(asyncMiddleware).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
  });

  it('propaga errori da Promises non awaitate', async () => {
    const req = {};
    const res = {};
    const next = vi.fn();

    const error = new Error('Promise rejection');

    const asyncMiddleware = vi.fn(() => {
      return Promise.reject(error);
    });

    const wrapped = catchAsync(asyncMiddleware);

    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('funziona anche se next è una funzione asincrona', async () => {
    const req = {};
    const res = {};
    const next = vi.fn(async () => {});

    const asyncMiddleware = vi.fn(async () => {
      throw new Error('Async next test');
    });

    const wrapped = catchAsync(asyncMiddleware);

    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
