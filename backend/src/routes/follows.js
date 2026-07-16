const express = require('express');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { follow, unfollow, checkFollow, listFollowing, getFollowerCount } = require('../controllers/followController');

const router = express.Router();

router.get('/following', authenticate, listFollowing);
router.get('/:tipsterId/status', optionalAuthenticate, checkFollow);
router.get('/:tipsterId/count', getFollowerCount);
router.post('/:tipsterId', authenticate, follow);
router.delete('/:tipsterId', authenticate, unfollow);

module.exports = router;
