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

const corsOptions = {
  origin(origin, callback) {
    if (NODE_ENV !== 'production') {
      return callback(null, true);
    }
    if (!origin || CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'leanstock-api', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    gitRev: process.env.GIT_REV || 'unknown',
    timestamp: new Date().toISOString(),
  });
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
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LeanStock] Server running on port ${PORT} (${NODE_ENV})`);
    console.log(`[LeanStock] Health: http://0.0.0.0:${PORT}/health`);

    require('./workers/decayWorker');
    verifySmtpConnection().catch(console.error);
    scheduleDecayJobs().catch((err) => {
      console.error('[LeanStock] Scheduler failed:', err.message);
    });
  });
}

module.exports = app;
