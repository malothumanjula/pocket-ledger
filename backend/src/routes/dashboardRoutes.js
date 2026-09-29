const express = require('express');
const { getDashboardStats } = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', getDashboardStats);

module.exports = router;
