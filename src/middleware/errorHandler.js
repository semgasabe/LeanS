// src/middleware/errorHandler.js
// Global error handler. Every unhandled error in routes ends up here.
// Returns consistent JSON error responses.

function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    console.error(err.stack);
  }

  // express-rate-limit behind proxy without trust proxy
  if (err.code === 'ERR_ERL_UNEXPECTED_X_FORWARDED_FOR' || err.code === 'ERR_ERL_PERMISSIVE_TRUST_PROXY') {
    return res.status(500).json({
      error: 'Server proxy configuration error. Set trust proxy on the API.',
      code: 'PROXY_CONFIG',
    });
  }

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
  if (err.code === 'P2003') {
    return res.status(409).json({
      error: 'Cannot delete: this record is referenced by other data (e.g. stock movements or audit logs). Remove related records first.',
      code: 'FOREIGN_KEY_CONSTRAINT',
    });
  }
  if (
    err.code === 'P2021' ||
    err.code === 'P1001' ||
    err.code === 'P1017' ||
    (err.message && /does not exist|relation.*User/i.test(err.message))
  ) {
    console.error('[ERROR] Database:', err.code, err.message);
    return res.status(503).json({
      error: 'Database schema missing. Redeploy API or run: npx prisma db push',
      code: 'DATABASE_ERROR',
    });
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
