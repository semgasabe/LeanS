// src/routes/order.routes.js
const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const c = require('../controllers/orderController');

router.get('/',           auth, requireRole('ADMIN', 'MANAGER'), c.listOrders);
router.get('/:id',        auth, requireRole('ADMIN', 'MANAGER'), c.getOrder);
router.post('/',          auth, requireRole('ADMIN', 'MANAGER'), c.createOrder);
router.patch('/:id/status', auth, requireRole('ADMIN', 'MANAGER'), c.updateOrderStatus);

module.exports = router;
