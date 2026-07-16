const express = require('express');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { createCombo, listCombos, getCombo, deleteCombo, myСombos } = require('../controllers/comboController');

const router = express.Router();

router.get('/', optionalAuthenticate, listCombos);
router.post('/', authenticate, createCombo);
router.get('/my', authenticate, myСombos);
router.get('/:id', optionalAuthenticate, getCombo);
router.delete('/:id', authenticate, deleteCombo);

module.exports = router;
