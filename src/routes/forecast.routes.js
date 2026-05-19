const router = require('express').Router();
const { auth } = require('../middleware/auth');
const c = require('../controllers/forecastController');

router.get('/', auth, c.getForecast);

module.exports = router;
