const express = require('express');
const { authenticate } = require('../middleware/auth');
const { addComment, listComments, deleteComment } = require('../controllers/commentController');

const router = express.Router();

router.get('/:tipId', listComments);
router.post('/:tipId', authenticate, addComment);
router.delete('/:commentId', authenticate, deleteComment);

module.exports = router;
