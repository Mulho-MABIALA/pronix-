const { Router } = require('express');
const prisma = require('../config/database');
const env = require('../config/env');
const { slugify } = require('../utils/slugify');

const router = Router();

const BASE = (env.FRONTEND_URL || 'https://fpronix.com').replace(/\/$/, '');

function url(loc, freq = 'weekly', priority = '0.5', lastmod = null) {
  return `  <url>
    <loc>${loc}</loc>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
  </url>`;
}

// GET /sitemap.xml
router.get('/', async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Pages statiques
    const staticUrls = [
      url(`${BASE}/`, 'daily', '1.0', today),
      url(`${BASE}/matchs`, 'hourly', '0.9', today),
      url(`${BASE}/pronostics`, 'hourly', '0.9', today),
      url(`${BASE}/tipsters`, 'daily', '0.8'),
      url(`${BASE}/actualites`, 'daily', '0.7'),
      url(`${BASE}/classements`, 'daily', '0.7'),
      url(`${BASE}/abonnement`, 'monthly', '0.6'),
      url(`${BASE}/cgu`, 'monthly', '0.3'),
      url(`${BASE}/politique-confidentialite`, 'monthly', '0.3'),
      url(`${BASE}/faq`, 'monthly', '0.4'),
    ];

    // Pages dynamiques — matchs des 7 derniers jours + 7 prochains
    const from = new Date();
    from.setDate(from.getDate() - 7);
    const to = new Date();
    to.setDate(to.getDate() + 7);

    const [matches, tipsters, competitions] = await Promise.all([
      prisma.match.findMany({
        where: { scheduledAt: { gte: from, lte: to } },
        select: { id: true, updatedAt: true },
        take: 200,
      }),
      prisma.user.findMany({
        where: { tipsterStats: { isNot: null } },
        select: { id: true, updatedAt: true },
        take: 100,
      }),
      prisma.competition.findMany({
        where: { isDisplayed: true },
        select: { id: true, name: true, updatedAt: true },
        take: 50,
      }),
    ]);

    const matchUrls = matches.map((m) =>
      url(`${BASE}/matchs/${m.id}`, 'hourly', '0.7', m.updatedAt.toISOString().slice(0, 10))
    );

    const tipsterUrls = tipsters.map((t) =>
      url(`${BASE}/tipsters/${t.id}`, 'weekly', '0.6', t.updatedAt.toISOString().slice(0, 10))
    );

    // Pages SEO par compétition — classement + pronostics du jour
    const competitionUrls = competitions.flatMap((c) => {
      const slug = slugify(c.name);
      if (!slug) return [];
      const lastmod = c.updatedAt.toISOString().slice(0, 10);
      return [
        url(`${BASE}/classements/${slug}`, 'daily', '0.6', lastmod),
        url(`${BASE}/pronostics/${slug}`, 'hourly', '0.6', lastmod),
      ];
    });

    const allUrls = [...staticUrls, ...matchUrls, ...tipsterUrls, ...competitionUrls];

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      allUrls.join('\n') +
      `\n</urlset>`
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;
