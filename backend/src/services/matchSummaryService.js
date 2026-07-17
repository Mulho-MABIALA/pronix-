// ─── Agent Résumé post-match — génère un article de blog après FINISHED ───────
const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');
const prisma = require('../config/database');
const { getOrCreateAITipster } = require('./aiTipsterService');

let client = null;
try {
  if (env.ANTHROPIC_API_KEY) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
} catch { /* SDK absent */ }

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

async function generateMatchSummary(matchId) {
  if (!client) return null;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { competition: true },
  });

  if (!match || match.status !== 'FINISHED') return null;
  if (match.homeScore == null || match.awayScore == null) return null;

  // Évite les doublons
  const scoreStr = `${match.homeScore}-${match.awayScore}`;
  const baseSlug = slugify(`resume-${match.homeTeam}-${match.awayTeam}-${scoreStr}`);
  const existing = await prisma.blogPost.findFirst({ where: { slug: { startsWith: baseSlug } } });
  if (existing) return null;

  const dateStr = new Date(match.scheduledAt).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const resultWord = match.homeScore > match.awayScore
    ? `Victoire de ${match.homeTeam}`
    : match.homeScore < match.awayScore
      ? `Victoire de ${match.awayTeam}`
      : 'Match nul';

  const prompt = `Écris un court article de résumé de match pour un site de statistiques football.

Match : ${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}
Compétition : ${match.competition?.name || 'Inconnue'}
Date : ${dateStr}
Résultat : ${resultWord}
${match.statistics ? `Données statistiques disponibles.` : ''}

Format demandé — réponds avec ce JSON :
{
  "title": "Titre accrocheur du résumé (max 80 chars)",
  "excerpt": "Résumé en 1 phrase percutante (max 200 chars)",
  "content": "Article complet en markdown, 150-250 mots, ton informatif, sans spoiler dans le premier paragraphe"
}

L'article doit mentionner le score, la compétition, et analyser brièvement la performance des deux équipes. En français, style journalistique sportif.`;

  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (resp.content[0]?.text || '').trim();
    const json = text.match(/\{[\s\S]*\}/);
    if (!json) return null;

    const article = JSON.parse(json[0]);
    const aiUser  = await getOrCreateAITipster();

    // Génère un slug unique
    const slug = `${baseSlug}-${Date.now()}`;

    const post = await prisma.blogPost.create({
      data: {
        slug,
        title:      (article.title  || `Résumé : ${match.homeTeam} ${scoreStr} ${match.awayTeam}`).slice(0, 200),
        excerpt:    (article.excerpt || '').slice(0, 500),
        content:    article.content || '',
        category:   'resume-match',
        published:  true,
        publishedAt: new Date(),
        authorId:   aiUser.id,
        metaTitle:  `${match.homeTeam} ${scoreStr} ${match.awayTeam} — ${match.competition?.name || ''}`,
        metaDesc:   (article.excerpt || '').slice(0, 160),
      },
    });

    console.log(`[MatchSummary] Article créé : ${post.slug}`);
    return post;
  } catch (err) {
    console.error('[MatchSummary] Erreur Claude:', err.message);
    return null;
  }
}

module.exports = { generateMatchSummary };
