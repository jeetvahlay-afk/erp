const express = require('express');
const { getDashboard, getDashboardView } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.get('/', getDashboard);
router.get('/:view', getDashboardView);
module.exports = router;
