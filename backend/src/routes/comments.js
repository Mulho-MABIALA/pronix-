const express = require('express');
const { authenticate } = require('../middleware/auth');
const { addComment, listComments, deleteComment } = require('../controllers/commentController');

const router = express.Router();

// Tipsters désactivés → toutes ces routes répondent 404 (cf. FEATURE_TIPSTERS)
router.use(require('../middleware/features').requireFeature('tipsters'));

router.get('/:tipId', listComments);
router.post('/:tipId', authenticate, addComment);
router.delete('/:commentId', authenticate, deleteComment);

module.exports = router;
