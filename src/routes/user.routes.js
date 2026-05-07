// src/routes/user.routes.js
const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const c = require('../controllers/userController');

router.get('/',     auth, requireRole('ADMIN'), c.listUsers);
router.put('/:id',  auth, requireRole('ADMIN'), c.updateUser);
router.delete('/:id', auth, requireRole('ADMIN'), c.deleteUser);

module.exports = router;
