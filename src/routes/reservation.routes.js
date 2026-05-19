const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const c = require('../controllers/reservationController');

router.post('/reserve', auth, requireRole('ADMIN', 'MANAGER', 'STAFF'), c.createReservation);
router.get('/reservation/status/:productId', auth, c.reservationStatus);

module.exports = router;
