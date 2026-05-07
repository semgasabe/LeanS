// src/routes/product.routes.js
const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const c = require('../controllers/productController');

router.get('/',     auth, c.listProducts);
router.get('/:id',  auth, c.getProduct);
router.post('/',    auth, requireRole('ADMIN', 'MANAGER'), c.createProduct);
router.put('/:id',  auth, requireRole('ADMIN', 'MANAGER'), c.updateProduct);
router.delete('/:id', auth, requireRole('ADMIN'), c.deleteProduct);

module.exports = router;
