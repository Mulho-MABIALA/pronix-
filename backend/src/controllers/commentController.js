// Commentaires sur les pronostics (tips)
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

const MAX_LENGTH = 500;

// POST /api/comments/:tipId — ajouter un commentaire
async function addComment(req, res, next) {
  try {
    const { tipId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
      throw new AppError('Le commentaire ne peut pas être vide', 400, 'EMPTY_COMMENT');
    }
    if (content.length > MAX_LENGTH) {
      throw new AppError(`Commentaire trop long (max ${MAX_LENGTH} caractères)`, 400, 'COMMENT_TOO_LONG');
    }

    const tip = await prisma.tip.findUnique({
      where: { id: tipId },
      select: { id: true, userId: true },
    });
    if (!tip) throw new AppError('Pronostic introuvable', 404, 'NOT_FOUND');

    const comment = await prisma.tipComment.create({
      data: {
        tipId,
        userId: req.user.id,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true, username: true,
            profile: { select: { displayName: true, avatar: true } },
          },
        },
      },
    });

    res.status(201).json({ success: true, data: comment });
  } catch (err) { next(err); }
}

// GET /api/comments/:tipId — liste des commentaires
async function listComments(req, res, next) {
  try {
    const { tipId } = req.params;
    const { limit = 50, page = 1 } = req.query;
    const take = Math.min(100, parseInt(limit));
    const skip = (parseInt(page) - 1) * take;

    const [comments, total] = await Promise.all([
      prisma.tipComment.findMany({
        where: { tipId },
        orderBy: { createdAt: 'asc' },
        take, skip,
        include: {
          user: {
            select: {
              id: true, username: true,
              profile: { select: { displayName: true, avatar: true } },
            },
          },
        },
      }),
      prisma.tipComment.count({ where: { tipId } }),
    ]);

    res.json({ success: true, data: comments, meta: { total } });
  } catch (err) { next(err); }
}

// DELETE /api/comments/:commentId — supprimer (auteur ou admin)
async function deleteComment(req, res, next) {
  try {
    const comment = await prisma.tipComment.findUnique({
      where: { id: req.params.commentId },
    });
    if (!comment) throw new AppError('Commentaire introuvable', 404, 'NOT_FOUND');
    if (comment.userId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new AppError('Non autorisé', 403, 'FORBIDDEN');
    }

    await prisma.tipComment.delete({ where: { id: req.params.commentId } });
    res.json({ success: true, message: 'Commentaire supprimé' });
  } catch (err) { next(err); }
}

module.exports = { addComment, listComments, deleteComment };
