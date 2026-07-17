// ─── Tipster IA — génère des pronostics quotidiens automatiquement ────────────
const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');
const prisma = require('../config/database');
const { broadcastNotification } = require('../controllers/pushController');

const AI_EMAIL    = 'ai@fpronix.com';
const AI_USERNAME = 'fpronix_ai';

let client = null;
try {
  if (env.ANTHROPIC_API_KEY) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
} catch { /* SDK absent */ }

// Récupère ou crée le compte tipster IA
async function getOrCreateAITipster() {
  let user = await prisma.user.findUnique({ where: { email: AI_EMAIL } });
  if (user) return user;

  user = await prisma.user.create({
    data: {
      email:         AI_EMAIL,
      username:      AI_USERNAME,
      emailVerified: true,
      role:          'USER',
      profile: {
        create: {
          displayName: '🤖 fpronix IA',
          bio: 'Agent IA de fpronix — pronostics quotidiens générés automatiquement par intelligence artificielle à partir des données des matchs.',
        },
      },
      tipsterStats: {
        create: {
          totalTips: 0, correctTips: 0, successRate: 0,
          monthlyTips: 0, monthlyCorrect: 0, monthlyRate: 0,
        },
      },
    },
  });

  console.log('[AITipster] Compte IA créé :', user.id);
  return user;
}

// Génère un pronostic Claude pour un match donné
async function generateTipForMatch(match) {
  if (!client) return null;

  const competition = match.competition?.name || 'Compétition inconnue';
  const dateStr = new Date(match.scheduledAt).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const oddsBlock = match.homeOdds
    ? `Cotes bookmakers : Domicile ${match.homeOdds} | Nul ${match.drawOdds} | Extérieur ${match.awayOdds}`
    : '';

  const statsBlock = match.statistics
    ? `Données statistiques disponibles.`
    : '';

  const prompt = `Tu es un expert en analyse football. Génère un pronostic pour ce match.

Match : ${match.homeTeam} vs ${match.awayTeam}
Compétition : ${competition}
Date : ${dateStr}
${oddsBlock}
${statsBlock}

Réponds UNIQUEMENT avec ce JSON valide, sans texte autour :
{
  "prediction": "HOME_WIN|DRAW|AWAY_WIN|OVER_2_5|UNDER_2_5|BTTS_YES|BTTS_NO",
  "confidence": 3,
  "analysis": "Analyse courte en 1-2 phrases en français (max 200 caractères)"
}

Règles :
- confidence : entier de 1 (faible) à 5 (très confiant)
- Choisis le marché le plus probable
- Sans données : léger avantage domicile par défaut`;

  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (resp.content[0]?.text || '').trim();
    const json = text.match(/\{[\s\S]*\}/);
    if (!json) return null;

    const parsed = JSON.parse(json[0]);
    const validPreds = ['HOME_WIN','DRAW','AWAY_WIN','OVER_2_5','UNDER_2_5','BTTS_YES','BTTS_NO'];
    if (!validPreds.includes(parsed.prediction)) return null;

    return {
      prediction: parsed.prediction,
      confidence:  Math.min(5, Math.max(1, Math.round(Number(parsed.confidence) || 3))),
      analysis:   (parsed.analysis || '').slice(0, 200),
    };
  } catch (err) {
    console.error('[AITipster] Erreur Claude:', err.message);
    return null;
  }
}

// Lance la génération quotidienne (appelé par le cron à 8h)
async function generateDailyTips() {
  if (!client) {
    console.log('[AITipster] Clé ANTHROPIC_API_KEY manquante — skip');
    return { generated: 0 };
  }

  const tipster = await getOrCreateAITipster();

  // Matchs d'aujourd'hui et demain, statut SCHEDULED, max 15
  const now      = new Date();
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + 2);

  const matches = await prisma.match.findMany({
    where: {
      scheduledAt: { gte: now, lt: deadline },
      status: 'SCHEDULED',
    },
    include: { competition: true },
    orderBy: { scheduledAt: 'asc' },
    take: 15,
  });

  let generated = 0;
  for (const match of matches) {
    // Évite les doublons
    const existing = await prisma.tip.findFirst({
      where: { userId: tipster.id, matchId: match.id },
    });
    if (existing) continue;

    const result = await generateTipForMatch(match);
    if (!result) continue;

    await prisma.tip.create({
      data: {
        userId:       tipster.id,
        matchId:      match.id,
        prediction:   result.prediction,
        confidence:   result.confidence,
        analysis:     result.analysis,
        isVisible:    true,
        isAiGenerated: true,
      },
    });
    generated++;
  }

  console.log(`[AITipster] ${generated} pronostic(s) générés`);

  // Push notification si au moins 1 tip généré
  if (generated > 0) {
    broadcastNotification({
      title: `🤖 ${generated} nouveau${generated > 1 ? 'x' : ''} pronostic${generated > 1 ? 's' : ''} IA`,
      body: `L'agent IA fpronix a publié ses pronostics du jour. Découvre-les maintenant !`,
      url: '/pronostics',
      tag: `ai-tips-${new Date().toISOString().split('T')[0]}`,
    }).catch(() => {});
  }

  return { generated };
}

module.exports = { generateDailyTips, getOrCreateAITipster };
