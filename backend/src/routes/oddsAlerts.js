const express = require('express');
const { authenticate } = require('../middleware/auth');
const { createAlert, listAlerts, deleteAlert, toggleAlert } = require('../controllers/oddsAlertController');

const router = express.Router();

router.get('/', authenticate, listAlerts);
router.post('/', authenticate, createAlert);
router.delete('/:id', authenticate, deleteAlert);
router.patch('/:id/toggle', authenticate, toggleAlert);

module.exports = router;
