const express = require('express');
const { requireRole } = require('../middleware/auth');
const c = require('../controllers/reviewController');

const router = express.Router();
const staff = requireRole('CaseWorker', 'Supervisor', 'Administrator');
router.get('/queue', staff, c.getQueue);
router.post('/approve', staff, c.approve);
router.post('/deny', staff, c.deny);

module.exports = router;
