import {describe, it, expect, vi} from 'vitest';
import catchAsync from '../../src/backend/utils/catchAsync';

describe('catchAsync', () => {
    it('should call the priveded function with req, res, next', async () => {
        const mockFn = vi.fn(async (req, res, next) => {
            return 'success';
        });

        const req = {};
        const res = {};
        const next = vi.fn();

        const wrappedFn = catchAsync(mockFn);
        await wrappedFn(req, res, next);

        expect(mockFn).toHaveBeenCalledWith(req, res, next);
        expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error if the async function throws', async () => {
        const testError = new Error('Test error');
        const mockFn = vi.fn(async (req, res, next) => {
            throw testError;
        });

        const req = {};
        const res = {};
        const next = vi.fn();

        const wrappedFn = catchAsync(mockFn);
        await wrappedFn(req, res, next);

        expect(mockFn).toHaveBeenCalledWith(req, res, next);
        expect(next).toHaveBeenCalledWith(testError);
    });

    it('should NOT handle synchronous errors', () => {
        const testError = new Error('Sync error');
        const mockFn = vi.fn((req, res, next) => {
            throw testError;
        });

        const req = {};
        const res = {};
        const next = vi.fn();

        const wrappedFn = catchAsync(mockFn);

        expect(() => wrappedFn(req, res, next)).toThrow(testError);
    });

    it('should work with non-async functions that return promises', async () => {
        const testError = new Error('Promise rejection');
        const mockFn = vi.fn((req, res, next) => {
            return Promise.reject(testError);
        });

        const req = {};
        const res = {};
        const next = vi.fn();

        const wrappedFn = catchAsync(mockFn);
        await wrappedFn(req, res, next);

        expect(mockFn).toHaveBeenCalledWith(req, res, next);
        expect(next).toHaveBeenCalledWith(testError);
    });
});