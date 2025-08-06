/**
 * @function catchAsync
 * @param {Function} fn - Un middleware Express ASINCRONO (async/await o che ritorna Promise).
 * @returns {Function} Un wrapper che gestisce errori di Promise/reiezioni async.
 * @throws {TypeError} Se fn non è una funzione asincrona.
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;
