const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const {
  getFavorites, addFavorite, removeFavorite, removeFavoriteByRef,
} = require('../controllers/favoritesController');

const router = Router();

router.use(authenticate);

router.get('/', getFavorites);
router.post('/', addFavorite);
router.delete('/by-ref', removeFavoriteByRef);
router.delete('/:id', removeFavorite);

module.exports = router;
