// Entry point. Sets up middleware, routes, Swagger UI, and background workers.
require('./config/env');

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const { PORT, CORS_ORIGINS, NODE_ENV } = require('./config/env');
const { verifySmtpConnection } = require('./config/email');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const { auth, requireRole } = require('./middleware/auth');

require('./jobs/emailQueue');
const { scheduleDecayJobs } = require('./workers/scheduler');

const jobController = require('./controllers/jobController');

const app = express();

app.use(cors({
  origin: NODE_ENV === 'production' ? CORS_ORIGINS : true,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/', apiLimiter);

const openapiPath = path.join(__dirname, '..', 'openapi.yaml');
if (fs.existsSync(openapiPath)) {
  const openapiDoc = YAML.parse(fs.readFileSync(openapiPath, 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDoc, {
    customSiteTitle: 'LeanStock API Docs',
  }));
}

app.use('/api/v1/tenants', require('./routes/tenant.routes'));
app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/products', require('./routes/product.routes'));
app.use('/api/v1/inventory', require('./routes/inventory.routes'));
app.use('/api/v1/orders', require('./routes/order.routes'));
app.use('/api/v1/locations', require('./routes/location.routes'));
app.use('/api/v1/users', require('./routes/user.routes'));
app.use('/api/v1/forecast', require('./routes/forecast.routes'));
app.use('/api/v1', require('./routes/reservation.routes'));

app.post('/api/v1/jobs/decay/trigger', auth, requireRole('ADMIN'), jobController.triggerDecay);
app.get('/api/v1/jobs/queue/status', auth, requireRole('ADMIN'), jobController.getQueueStatusController);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND' });
});

app.use(errorHandler);

if (require.main === module) {
  require('./workers/decayWorker');
  verifySmtpConnection().catch(console.error);
  scheduleDecayJobs().catch(console.error);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LeanStock] Server running on port ${PORT} (${NODE_ENV})`);
    console.log(`[LeanStock] API docs: http://localhost:${PORT}/api-docs`);
    console.log('[LeanStock] Background workers: Email Queue, Dead Stock Decay');
  });
}

module.exports = app;
