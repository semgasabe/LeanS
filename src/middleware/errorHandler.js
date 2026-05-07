// src/middleware/errorHandler.js
// Global error handler. Every unhandled error in routes ends up here.
// Returns consistent JSON error responses.

function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Prisma known errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'A record with this value already exists',
      code: 'CONFLICT',
      field: err.meta?.target,
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found', code: 'NOT_FOUND' });
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(422).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  // Custom status errors (thrown manually in services)
  if (err.status) {
    return res.status(err.status).json({ error: err.message, code: err.code || 'ERROR' });
  }

  // Fallback - unexpected server error
  res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
}

module.exports = errorHandler;
