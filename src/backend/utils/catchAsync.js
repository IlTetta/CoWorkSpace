/**
 * @function catchAsync
 * @param {Function} fn - Una funzione async Express middleware (req, res, next).
 * @returns {Function} Un wrapper che gestisce gli errori per la funzione middleware.
 *
 * Questa funzione è un "wrapper" per i middleware asincroni.
 * Cattura qualsiasi errore che si verifica all'interno del middleware asincrono
 * e lo passa al prossimo middleware di gestione degli errori di Express,
 * senza che sia necessario un blocco try/catch in ogni funzione.
 * * Esempio:
 * exports.getUsers = catchAsync(async (req, res, next) => {
 * // La Promise verrà gestita da questo wrapper.
 * const users = await pool.query('SELECT * FROM users');
 * res.status(200).json({ users: users.rows });
 * });
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    // Esegue la funzione `fn` e, se restituisce una Promise,
    // cattura qualsiasi errore e lo passa al middleware successivo (`next`).
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;
