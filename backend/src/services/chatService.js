/**
 * Service Chat IA — répond aux questions sur un match spécifique
 * Utilise Claude Haiku + contexte match (prédictions + forme si dispo)
 *
 * Quotas :
 *  - Non connecté  → bloqué
 *  - FREE          → 3 questions / jour
 *  - PREMIUM / PRO → illimité
 */

const Anthropic = require('@anthropic-ai/sdk');
const prisma    = require('../config/database');
const env       = require('../config/env');

let client = null;
try {
  if (env.ANTHROPIC_API_KEY) {
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
} catch { /* SDK absent */ }

// ── Quota en mémoire (se reset au redémarrage — acceptable pour MVP) ──────────
const _dailyQuota = new Map(); // `${userId}-${YYYY-MM-DD}` → count

function getQuotaKey(userId) {
  const today = new Date().toISOString().slice(0, 10);
  return `${userId}-${today}`;
}

const FREE_DAILY_LIMIT = 3;

function checkAndIncrementQuota(userId, isPremium) {
  if (isPremium) return { allowed: true, used: null, limit: null };
  const key   = getQuotaKey(userId);
  const count = _dailyQuota.get(key) || 0;
  if (count >= FREE_DAILY_LIMIT) {
    return { allowed: false, used: count, limit: FREE_DAILY_LIMIT };
  }
  _dailyQuota.set(key, count + 1);
  return { allowed: true, used: count + 1, limit: FREE_DAILY_LIMIT };
}

/**
 * Génère une réponse IA à une question sur un match.
 * @param {string} matchId
 * @param {string} question   — question de l'utilisateur
 * @param {Object} user       — { id, plan }
 * @returns {{ answer: string, quota: Object }}
 */
async function askAboutMatch(matchId, question, user) {
  if (!client) {
    throw new Error('Service IA non disponible (clé API manquante)');
  }

  const isPremium = ['PREMIUM', 'PRO', 'LIFETIME'].includes(user?.plan?.code);

  // Vérifier le quota
  const quota = checkAndIncrementQuota(user.id, isPremium);
  if (!quota.allowed) {
    const err = new Error(`Quota journalier atteint (${FREE_DAILY_LIMIT} questions/jour sur le plan gratuit). Passez Premium pour des questions illimitées.`);
    err.statusCode = 429;
    throw err;
  }

  // Récupérer le match depuis la DB
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      homeTeam: true, awayTeam: true,
      scheduledAt: true, status: true,
      homeScore: true, awayScore: true,
      predictions: true,
      competition: { select: { name: true } },
    },
  });

  if (!match) throw new Error('Match introuvable');

  // Construire le contexte du match
  const dateStr = match.scheduledAt
    ? new Date(match.scheduledAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Date inconnue';

  const statusStr = match.status === 'FINISHED'
    ? `Terminé (${match.homeScore}-${match.awayScore})`
    : match.status === 'LIVE'
      ? `En direct (${match.homeScore}-${match.awayScore})`
      : `Prévu le ${dateStr}`;

  const pred = match.predictions;
  const predContext = pred ? `
Prédictions algorithmiques :
- Probabilité victoire domicile : ${pred.home}%
- Probabilité nul : ${pred.draw}%
- Probabilité victoire extérieur : ${pred.away}%
- Plus de 2.5 buts : ${pred.over25}%
- Les 2 équipes marquent (BTTS) : ${pred.btts}%
- Meilleur pick : ${pred.bestPick?.label} (${pred.bestPick?.prob}%)
${pred.aiReasoning ? `- Analyse IA : ${pred.aiReasoning}` : ''}
${pred.scorelines?.length ? `- Scénarios probables : ${pred.scorelines.slice(0, 3).map(s => `${s.score} (${s.prob}%)`).join(' • ')}` : ''}` : 'Prédictions non disponibles.';

  const systemPrompt = `Tu es un assistant expert en analyse footballistique pour le site fpronix.com.
Tu analyses les matchs de football et réponds aux questions des utilisateurs de façon concise, honnête et éclairée.
Tu rappelles toujours que tes analyses sont indicatives et non des conseils de paris.
Réponds en français, de façon conversationnelle et concise (3-5 phrases max sauf si plus de détails sont demandés).`;

  const userPrompt = `Match : ${match.homeTeam} vs ${match.awayTeam}
Compétition : ${match.competition?.name || 'Inconnue'}
Statut : ${statusStr}

${predContext}

Question de l'utilisateur : ${question}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const answer = response.content[0]?.text?.trim() || 'Je n\'ai pas pu générer une réponse.';

  return {
    answer,
    quota: isPremium
      ? { used: null, limit: null, unlimited: true }
      : { used: quota.used, limit: FREE_DAILY_LIMIT, unlimited: false },
  };
}

module.exports = { askAboutMatch };
