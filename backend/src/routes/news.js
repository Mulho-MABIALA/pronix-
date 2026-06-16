const { Router } = require('express');
const { getNews } = require('../controllers/newsController');

const router = Router();

router.get('/', getNews);

module.exports = router;
