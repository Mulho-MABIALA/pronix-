const { z } = require('zod');
const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');

const postSchema = z.object({
  title:      z.string().min(5).max(200),
  slug:       z.string().min(3).max(200).regex(/^[a-z0-9-]+$/),
  content:    z.string().min(10),
  excerpt:    z.string().max(500).optional(),
  coverImage: z.string().url().optional().or(z.literal('')),
  category:   z.string().default('general'),
  published:  z.boolean().default(false),
  metaTitle:  z.string().max(70).optional(),
  metaDesc:   z.string().max(160).optional(),
});

// GET /blog — liste publique (publiés uniquement)
async function listPosts(req, res, next) {
  try {
    const page     = Math.max(1, parseInt(req.query.page) || 1);
    const limit    = Math.min(20, parseInt(req.query.limit) || 10);
    const category = req.query.category;
    const skip     = (page - 1) * limit;

    const where = { published: true, ...(category && { category }) };

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, slug: true, title: true, excerpt: true,
          coverImage: true, category: true, publishedAt: true, views: true,
          author: { select: { username: true, profile: { select: { displayName: true, avatar: true } } } },
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    res.json({ success: true, data: posts, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

// GET /blog/:slug — article complet
async function getPost(req, res, next) {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug: req.params.slug },
      include: { author: { select: { username: true, profile: { select: { displayName: true, avatar: true } } } } },
    });

    if (!post || (!post.published && req.user?.role !== 'ADMIN')) {
      throw new AppError('Article introuvable', 404, 'NOT_FOUND');
    }

    // Incrémenter les vues (fire & forget)
    prisma.blogPost.update({ where: { slug: req.params.slug }, data: { views: { increment: 1 } } }).catch(() => {});

    res.json({ success: true, data: post });
  } catch (err) { next(err); }
}

// POST /admin/blog — créer article
async function createPost(req, res, next) {
  try {
    const data = postSchema.parse(req.body);
    const existing = await prisma.blogPost.findUnique({ where: { slug: data.slug } });
    if (existing) throw new AppError('Ce slug est déjà utilisé', 409, 'SLUG_CONFLICT');

    const post = await prisma.blogPost.create({
      data: {
        ...data,
        authorId:    req.user.id,
        publishedAt: data.published ? new Date() : null,
        coverImage:  data.coverImage || null,
      },
    });

    res.status(201).json({ success: true, data: post });
  } catch (err) { next(err); }
}

// PATCH /admin/blog/:id — modifier article
async function updatePost(req, res, next) {
  try {
    const data = postSchema.partial().parse(req.body);
    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Article introuvable', 404, 'NOT_FOUND');

    // Si on publie pour la première fois → set publishedAt
    const publishedAt = (!existing.published && data.published) ? new Date() : existing.publishedAt;

    const post = await prisma.blogPost.update({
      where: { id: req.params.id },
      data: { ...data, publishedAt },
    });

    res.json({ success: true, data: post });
  } catch (err) { next(err); }
}

// DELETE /admin/blog/:id
async function deletePost(req, res, next) {
  try {
    await prisma.blogPost.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Article supprimé' });
  } catch (err) { next(err); }
}

// GET /admin/blog — tous les articles (admin)
async function adminListPosts(req, res, next) {
  try {
    const posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, slug: true, title: true, category: true,
        published: true, publishedAt: true, views: true, createdAt: true,
      },
    });
    res.json({ success: true, data: posts });
  } catch (err) { next(err); }
}

module.exports = { listPosts, getPost, createPost, updatePost, deletePost, adminListPosts };
