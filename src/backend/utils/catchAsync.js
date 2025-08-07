/**
 * Utility per gestire automaticamente errori in funzioni asincrone di Express
 * Fornisce anche logging e performance monitoring opzionale
 * 
 * @function catchAsync
 * @param {Function} fn - Middleware Express asincrono (async/await o che ritorna Promise)
 * @param {Object} [options] - Opzioni di configurazione
 * @param {boolean} [options.logErrors=true] - Se loggare automaticamente gli errori
 * @param {boolean} [options.measurePerformance=false] - Se misurare il tempo di esecuzione
 * @param {string} [options.operationName] - Nome dell'operazione per il logging
 * @returns {Function} Wrapper che gestisce errori di Promise/reiezioni async
 * @throws {TypeError} Se fn non è una funzione
 * 
 * @example
 * // Uso base
 * exports.getUser = catchAsync(async (req, res, next) => {
 *   const user = await User.findById(req.params.id);
 *   res.json(user);
 * });
 * 
 * // Uso con opzioni
 * exports.complexOperation = catchAsync(async (req, res, next) => {
 *   // operazione complessa
 * }, { measurePerformance: true, operationName: 'complexOperation' });
 */
const catchAsync = (fn, options = {}) => {
    // Validazione input
    if (typeof fn !== 'function') {
        throw new TypeError('catchAsync: il primo parametro deve essere una funzione');
    }

    const {
        logErrors = true,
        measurePerformance = false,
        operationName = fn.name || 'anonymous'
    } = options;

    return (req, res, next) => {
        let startTime;
        
        if (measurePerformance) {
            startTime = process.hrtime.bigint();
        }

        Promise.resolve(fn(req, res, next))
            .then((result) => {
                // Log performance se abilitato
                if (measurePerformance) {
                    const endTime = process.hrtime.bigint();
                    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
                    console.log(`[PERFORMANCE] ${operationName}: ${duration.toFixed(2)}ms`);
                }
                return result;
            })
            .catch((error) => {
                // Log dell'errore se abilitato
                if (logErrors) {
                    console.error(`[ERROR] in ${operationName}:`, {
                        message: error.message,
                        stack: error.stack,
                        url: req.originalUrl || 'unknown',
                        method: req.method || 'unknown',
                        ip: req.ip || 'unknown',
                        userAgent: (req.get && req.get('User-Agent')) || 'unknown',
                        timestamp: new Date().toISOString()
                    });
                }

                // Passa l'errore al middleware di gestione errori
                next(error);
            });
    };
};

/**
 * Versione semplificata di catchAsync per operazioni rapide
 * Non include logging automatico per ridurre overhead
 */
catchAsync.simple = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Versione per operazioni critiche con logging esteso
 */
catchAsync.critical = (fn, operationName) => {
    return catchAsync(fn, {
        logErrors: true,
        measurePerformance: true,
        operationName: operationName || 'critical-operation'
    });
};

module.exports = catchAsync;
