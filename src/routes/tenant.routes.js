// src/routes/tenant.routes.js
const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const tenantController = require('../controllers/tenantController');

router.get('/my-tenant', auth, tenantController.getMyTenant);
router.get('/audit-logs', auth, tenantController.getAuditLogs);
router.post('/tenants', auth, requireRole('ADMIN'), tenantController.createTenant);

module.exports = router;