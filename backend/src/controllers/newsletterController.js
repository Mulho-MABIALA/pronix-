const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../middleware/errorHandler');
const { sendEmail } = require('../services/emailService');
const env = require('../config/env');

const prisma = new PrismaClient();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Inscription publique (page /newsletter) ──────────────────────────────────
async function subscribe(req, res, next) {
  try {
    const { email, language, source } = req.body || {};

    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      throw new AppError('Adresse e-mail invalide', 400, 'INVALID_EMAIL');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (existing.isActive) {
        return res.json({
          success: true,
          alreadySubscribed: true,
          message: 'Cette adresse est déjà inscrite à la newsletter.',
        });
      }
      // Ancien désinscrit → on le réactive
      await prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: { isActive: true, unsubscribedAt: null, language: language || existing.language, source: source || existing.source },
      });
      return res.json({ success: true, message: 'Inscription réactivée !' });
    }

    await prisma.newsletterSubscriber.create({
      data: {
        email: normalizedEmail,
        language: language || 'fr',
        source: source || 'newsletter_page',
      },
    });

    const appUrl = env.FRONTEND_URL || 'https://fpronix.com';
    sendEmail({
      to: normalizedEmail,
      subject: 'Bienvenue dans la newsletter fpronix ⚽',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
          <h2 style="color: #16a34a;">Bienvenue chez fpronix !</h2>
          <p>Merci de t'être inscrit(e) à notre newsletter. Tu recevras désormais nos meilleurs pronostics, analyses et offres directement par e-mail.</p>
          <p><a href="${appUrl}" style="color: #16a34a; font-weight: bold;">Découvrir fpronix</a></p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #888;">Tu peux te désinscrire à tout moment en répondant à cet e-mail.</p>
        </div>
      `,
    }).catch(() => {});

    res.status(201).json({ success: true, message: 'Inscription réussie !' });
  } catch (err) {
    next(err);
  }
}

// ── Désinscription publique (lien dans les emails, sans auth) ───────────────
async function unsubscribe(req, res, next) {
  try {
    const { email } = req.body || {};
    if (!email) throw new AppError('Adresse e-mail requise', 400, 'MISSING_EMAIL');

    const normalizedEmail = email.trim().toLowerCase();
    const sub = await prisma.newsletterSubscriber.findUnique({ where: { email: normalizedEmail } });

    if (!sub) {
      return res.json({ success: true, message: 'Adresse introuvable (déjà désinscrite ou jamais inscrite).' });
    }

    await prisma.newsletterSubscriber.update({
      where: { id: sub.id },
      data: { isActive: false, unsubscribedAt: new Date() },
    });

    res.json({ success: true, message: 'Désinscription confirmée.' });
  } catch (err) {
    next(err);
  }
}

// ── Admin: liste des abonnés ──────────────────────────────────────────────────
async function getAdminSubscribers(req, res, next) {
  try {
    const { search = '', active, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * take;

    const where = {
      ...(search ? { email: { contains: search, mode: 'insensitive' } } : {}),
      ...(active === 'true' ? { isActive: true } : active === 'false' ? { isActive: false } : {}),
    };

    const [subscribers, total, activeCount] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.newsletterSubscriber.count({ where }),
      prisma.newsletterSubscriber.count({ where: { isActive: true } }),
    ]);

    res.json({
      success: true,
      data: subscribers,
      pagination: { page: pageNum, limit: take, total, pages: Math.ceil(total / take) },
      activeCount,
    });
  } catch (err) {
    next(err);
  }
}

// ── Admin: export CSV ─────────────────────────────────────────────────────────
async function exportSubscribers(req, res, next) {
  try {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'email,langue,source,date_inscription\n';
    const rows = subscribers
      .map((s) => `${s.email},${s.language},${s.source || ''},${s.createdAt.toISOString()}`)
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="newsletter-subscribers.csv"');
    res.send(header + rows);
  } catch (err) {
    next(err);
  }
}

// ── Admin: suppression d'un abonné ────────────────────────────────────────────
async function deleteSubscriber(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.newsletterSubscriber.delete({ where: { id } });
    res.json({ success: true, message: 'Abonné supprimé' });
  } catch (err) {
    if (err.code === 'P2025') {
      return next(new AppError('Abonné introuvable', 404, 'NOT_FOUND'));
    }
    next(err);
  }
}

module.exports = {
  subscribe,
  unsubscribe,
  getAdminSubscribers,
  exportSubscribers,
  deleteSubscriber,
};
