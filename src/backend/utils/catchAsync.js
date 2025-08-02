/**
 * @function catchAsync
 * @param {Function} fn - Un middleware Express ASINCRONO (async/await o che ritorna Promise).
 * @returns {Function} Un wrapper che gestisce errori di Promise/reiezioni async.
 * @throws {TypeError} Se fn non è una funzione asincrona.
 * 
 * ESEMPIO CORRETTO (async):
 * ```exports.getUser = catchAsync(async (req, res, next) => {
 *   const user = await User.find(id);
 *   res.json(user);
 * });
 * ```
 * ESEMPIO NON SUPPORTATO (sync):
 * ```exports.getUser = catchAsync((req, res, next) => {
 *   throw new Error('Non funzionerà!'); // Non catturato
 * });
 * ```
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;
