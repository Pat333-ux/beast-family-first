const express = require('express');
const { requireRole } = require('../middleware/auth');
const { createIntake } = require('../controllers/intakeController');

const router = express.Router();
router.post('/', requireRole('Citizen', 'CaseWorker', 'Supervisor', 'Administrator'), createIntake);

module.exports = router;
