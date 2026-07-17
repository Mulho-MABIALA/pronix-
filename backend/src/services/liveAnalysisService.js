// ─── Agent Live — mini-analyse IA pendant les matchs en direct ─────────────────
const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');
const prisma = require('../config/database');

let client = null;
try {
  if (env.ANTHROPIC_API_KEY) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
} catch { /* SDK absent */ }

// Cache en mémoire : matchId → { analysis, generatedAt }
const analysisCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getLiveAnalysis(matchId) {
  if (!client) return null;

  // Vérifie le cache
  const cached = analysisCache.get(matchId);
  if (cached && Date.now() - cached.generatedAt < CACHE_TTL_MS) {
    return cached.analysis;
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { competition: true },
  });

  if (!match || match.status !== 'LIVE') return null;

  const scoreStr = match.homeScore != null
    ? `Score actuel : ${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}`
    : 'Score non disponible';

  const minuteStr = match.minute ? `Minute : ${match.minute}` : '';

  const statsBlock = match.statistics
    ? (() => {
        try {
          const s = typeof match.statistics === 'string'
            ? JSON.parse(match.statistics)
            : match.statistics;
          const home = s?.[0]?.statistics || [];
          const away = s?.[1]?.statistics || [];
          const possession = home.find((x) => x.type === 'Ball Possession');
          const shots      = home.find((x) => x.type === 'Total Shots');
          if (!possession && !shots) return '';
          return `Possession : ${possession?.value || '?'} / ${away.find((x) => x.type === 'Ball Possession')?.value || '?'}
Tirs : ${shots?.value || '?'} / ${away.find((x) => x.type === 'Total Shots')?.value || '?'}`;
        } catch { return ''; }
      })()
    : '';

  const prompt = `Tu es un commentateur football expert. Génère une mini-analyse du match en cours.

${match.homeTeam} vs ${match.awayTeam}
Compétition : ${match.competition?.name || 'Inconnue'}
${minuteStr}
${scoreStr}
${statsBlock}

Réponds avec ce JSON :
{
  "headline": "Titre accrocheur (max 60 chars)",
  "analysis": "Analyse du match en 2-3 phrases, factuelle et engageante",
  "momentum": "HOME|AWAY|BALANCED",
  "keyFact": "Fait clé à retenir (1 phrase courte)"
}

En français, style commentateur TV.`;

  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (resp.content[0]?.text || '').trim();
    const json = text.match(/\{[\s\S]*\}/);
    if (!json) return null;

    const analysis = {
      ...JSON.parse(json[0]),
      generatedAt: new Date().toISOString(),
      minute: match.minute,
      score: { home: match.homeScore, away: match.awayScore },
    };

    analysisCache.set(matchId, { analysis, generatedAt: Date.now() });
    return analysis;
  } catch (err) {
    console.error('[LiveAnalysis] Erreur Claude:', err.message);
    return null;
  }
}

module.exports = { getLiveAnalysis };
