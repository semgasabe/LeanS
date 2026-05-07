// src/routes/inventory.routes.js
const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const c = require('../controllers/inventoryController');

router.get('/',                auth, c.listInventory);
router.post('/',               auth, requireRole('ADMIN', 'MANAGER'), c.createInventory);
router.get('/alerts/low-stock', auth, requireRole('ADMIN', 'MANAGER'), c.getLowStockAlerts);
router.post('/transfer',       auth, requireRole('ADMIN', 'MANAGER'), c.transferStock);
router.get('/:id',             auth, c.getInventoryItem);
router.post('/:id/movements',  auth, requireRole('ADMIN', 'MANAGER', 'STAFF'), c.recordMovement);
router.get('/:id/movements',   auth, c.getMovements);

module.exports = router;
