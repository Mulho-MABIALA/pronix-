const { Router } = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { listPosts, getPost, createPost, updatePost, deletePost, adminListPosts } = require('../controllers/blogController');

const router = Router();

// Admin — must come before /:slug to avoid ambiguity
router.get('/admin/all', authenticate, requireAdmin, adminListPosts);
router.post('/', authenticate, requireAdmin, createPost);
router.patch('/:id', authenticate, requireAdmin, updatePost);
router.delete('/:id', authenticate, requireAdmin, deletePost);

// Public
router.get('/', listPosts);
router.get('/:slug', getPost);

module.exports = router;
