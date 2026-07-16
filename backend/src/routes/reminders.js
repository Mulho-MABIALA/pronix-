const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { getReminders } = require('../controllers/remindersController');

const router = Router();

router.use(authenticate);

router.get('/', getReminders);

module.exports = router;
