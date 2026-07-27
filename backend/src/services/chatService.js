/**
 * Service Chat IA — répond aux questions sur un match spécifique
 * Quota stocké en PostgreSQL → partagé entre tous les workers PM2 cluster
 *
 * Quotas :
 *  - FREE          → 3 questions / jour
 *  - PREMIUM / PRO / LIFETIME → illimité
 */

const Anthropic = require('@anthropic-ai/sdk');
const prisma    = require('../config/database');
const env       = require('../config/env');
const { getUserPlanCode } = require('../middleware/subscription');

let client = null;
try {
  if (env.ANTHROPIC_API_KEY) {
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
} catch { /* SDK absent */ }

const FREE_DAILY_LIMIT = 3;

function today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Vérifie et incrémente le quota journalier en DB (atomic upsert).
 * Retourne { allowed, used, limit }
 */
async function checkAndIncrementQuota(userId, isPremium) {
  if (isPremium) return { allowed: true, used: null, limit: null };

  const date = today();

  // upsert : crée l'enregistrement si inexistant, puis incrémente
  const quota = await prisma.chatQuota.upsert({
    where:  { userId_date: { userId, date } },
    create: { userId, date, count: 1 },
    update: { count: { increment: 1 } },
  });

  // Si après incrément on dépasse la limite, on décrémente et refuse
  if (quota.count > FREE_DAILY_LIMIT) {
    await prisma.chatQuota.update({
      where:  { userId_date: { userId, date } },
      data:   { count: { decrement: 1 } },
    });
    return { allowed: false, used: FREE_DAILY_LIMIT, limit: FREE_DAILY_LIMIT };
  }

  return { allowed: true, used: quota.count, limit: FREE_DAILY_LIMIT };
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

  // NB : on dérive le plan via getUserPlanCode() (abonnement actif + essai 7 jours),
  // pas via user.plan.code qui n'existe pas sur l'objet User (bug corrigé — sans ça,
  // même les comptes Premium/Pro/Lifetime étaient limités à 3 questions/jour).
  const isPremium = ['PREMIUM', 'PRO', 'LIFETIME'].includes(getUserPlanCode(user));

  // Vérifier et incrémenter le quota en DB
  const quota = await checkAndIncrementQuota(user.id, isPremium);
  if (!quota.allowed) {
    const err = new Error(
      `Quota journalier atteint (${FREE_DAILY_LIMIT} questions/jour sur le plan gratuit). Passez Premium pour des questions illimitées.`
    );
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
    ? new Date(match.scheduledAt).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : 'Date inconnue';

  const statusStr = match.status === 'FINISHED'
    ? `Terminé (${match.homeScore}-${match.awayScore})`
    : match.status === 'LIVE'
      ? `En direct (${match.homeScore}-${match.awayScore})`
      : `Prévu le ${dateStr}`;

  const pred = match.predictions;
  const predContext = pred
    ? `Prédictions algorithmiques :
- Probabilité victoire domicile : ${pred.home}%
- Probabilité nul : ${pred.draw}%
- Probabilité victoire extérieur : ${pred.away}%
- Plus de 2.5 buts : ${pred.over25}%
- Les 2 équipes marquent (BTTS) : ${pred.btts}%
- Meilleur pick : ${pred.bestPick?.label} (${pred.bestPick?.prob}%)
${pred.aiReasoning ? `- Analyse IA : ${pred.aiReasoning}` : ''}
${pred.scorelines?.length ? `- Scénarios probables : ${pred.scorelines.slice(0, 3).map((s) => `${s.score} (${s.prob}%)`).join(' • ')}` : ''}`
    : 'Prédictions non disponibles.';

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
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userPrompt }],
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
