// src/routes/location.routes.js
const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const c = require('../controllers/locationController');

router.get('/',     auth, c.listLocations);
router.get('/:id',  auth, c.getLocation);
router.post('/',    auth, requireRole('ADMIN'), c.createLocation);
router.put('/:id',  auth, requireRole('ADMIN'), c.updateLocation);
router.delete('/:id', auth, requireRole('ADMIN'), c.deleteLocation);

module.exports = router;
