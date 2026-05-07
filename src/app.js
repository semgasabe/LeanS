// src/app.js
// Entry point. Sets up all middleware, routes, Swagger UI, and cron jobs.
require('./config/env'); // validate env vars first - crashes if anything missing

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const { PORT, CORS_ORIGINS, NODE_ENV } = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const { auth, requireRole } = require('./middleware/auth');

// Workers and queues
const { emailQueue, emailWorker } = require('./jobs/emailQueue');
const { decayWorker } = require('./workers/decayWorker');
const { scheduleDecayJobs } = require('./workers/scheduler');

const jobController = require('./controllers/jobController');

const app = express();

// ── CORS ───────────────────────────────────────────────────────────────────
// No wildcard origins in production - configured from env
app.use(cors({
  origin: NODE_ENV === 'production' ? CORS_ORIGINS : true,
  credentials: true, // needed for cookies (refresh token)
}));

// ── Body parsing ───────────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// ── Rate limiting on all API routes ───────────────────────────────────────
app.use('/api/', apiLimiter);

// ── Swagger UI ────────────────────────────────────────────────────────────
// Serves the API docs at /api-docs
// Reads the openapi.yaml file that was submitted with the blueprint
const openapiPath = path.join(__dirname, '..', 'openapi.yaml');
if (fs.existsSync(openapiPath)) {
  const openapiDoc = YAML.parse(fs.readFileSync(openapiPath, 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDoc, {
    customSiteTitle: 'LeanStock API Docs',
  }));
}

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',      require('./routes/auth.routes'));
app.use('/api/v1/products',  require('./routes/product.routes'));
app.use('/api/v1/inventory', require('./routes/inventory.routes'));
app.use('/api/v1/orders',    require('./routes/order.routes'));
app.use('/api/v1/locations', require('./routes/location.routes'));
app.use('/api/v1/users',     require('./routes/user.routes'));

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 for unknown routes ────────────────────────────────────────────────
app.post('/api/v1/jobs/decay/trigger', auth, requireRole('ADMIN'), jobController.triggerDecay);
app.get('/api/v1/jobs/queue/status', auth, requireRole('ADMIN'), jobController.getQueueStatusController);
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND' });
});

// ── Global error handler (must be last) ───────────────────────────────────
app.use(errorHandler);

// ── Start server and background workers ───────────────────────────────────
if (require.main === module) {
  // Запуск планировщика decay jobs
  scheduleDecayJobs().catch(console.error);
  
  app.listen(PORT, () => {
    console.log(`[LeanStock] Server running on port ${PORT} (${NODE_ENV})`);
    console.log(`[LeanStock] API docs: http://localhost:${PORT}/api-docs`);
    console.log(`[LeanStock] Background workers: Email Queue, Dead Stock Decay`);
  });
}

module.exports = app; // export for tests