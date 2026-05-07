// src/utils/asyncHandler.js
// Wraps async route handlers so we don't need try/catch in every controller.
// Any error thrown inside will be passed to Express error handler.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
