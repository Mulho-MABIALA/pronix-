const { Router } = require('express');
const { globalSearch } = require('../controllers/searchController');

const router = Router();

router.get('/', globalSearch);

module.exports = router;
