// ─── Coach Personnel IA — analyse l'historique de paris et donne des conseils ──
const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');
const prisma = require('../config/database');

let client = null;
try {
  if (env.ANTHROPIC_API_KEY) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
} catch { /* SDK absent */ }

// Calcule des stats agrégées depuis les BetEntry
function computeStats(bets) {
  const resolved = bets.filter((b) => b.result && b.result !== 'VOID');
  const wins     = resolved.filter((b) => b.result === 'WIN');
  const losses   = resolved.filter((b) => b.result === 'LOSS');

  const totalStake  = bets.reduce((s, b) => s + b.stake, 0);
  const totalPayout = wins.reduce((s, b) => s + Math.round(b.stake * b.odds), 0);
  const roi         = totalStake > 0 ? ((totalPayout - totalStake) / totalStake * 100).toFixed(1) : 0;
  const winRate     = resolved.length > 0 ? (wins.length / resolved.length * 100).toFixed(0) : 0;

  // Stats par type de pari
  const byType = {};
  for (const b of resolved) {
    const type = b.prediction || 'AUTRE';
    if (!byType[type]) byType[type] = { wins: 0, total: 0, stake: 0 };
    byType[type].total++;
    byType[type].stake += b.stake;
    if (b.result === 'WIN') byType[type].wins++;
  }

  // Trouve le type de pari le plus faible
  const weakestType = Object.entries(byType)
    .filter(([, v]) => v.total >= 3)
    .sort(([, a], [, b]) => (a.wins / a.total) - (b.wins / b.total))[0];

  // Trouve le type de pari le plus fort
  const strongestType = Object.entries(byType)
    .filter(([, v]) => v.total >= 3)
    .sort(([, a], [, b]) => (b.wins / b.total) - (a.wins / a.total))[0];

  // Cote moyenne jouée
  const avgOdds = bets.length > 0
    ? (bets.reduce((s, b) => s + b.odds, 0) / bets.length).toFixed(2)
    : 0;

  return {
    total: bets.length,
    resolved: resolved.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    roi,
    totalStake,
    totalPayout,
    avgOdds,
    byType,
    weakestType: weakestType ? { name: weakestType[0], ...weakestType[1] } : null,
    strongestType: strongestType ? { name: strongestType[0], ...strongestType[1] } : null,
  };
}

const PRED_FR = {
  HOME_WIN: 'Victoire domicile', AWAY_WIN: 'Victoire extérieur', DRAW: 'Match nul',
  OVER_2_5: 'Plus de 2.5 buts', UNDER_2_5: 'Moins de 2.5 buts',
  BTTS_YES: 'Les 2 équipes marquent', BTTS_NO: 'BTTS Non',
};

async function getPersonalCoaching(userId) {
  // Récupère les 50 derniers paris
  const bets = await prisma.betEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  if (bets.length < 3) {
    return {
      hasEnoughData: false,
      message: 'Ajoutez au moins 3 paris dans votre historique pour recevoir des conseils personnalisés.',
      stats: null,
      advice: null,
    };
  }

  const stats = computeStats(bets);

  if (!client) {
    // Retourne les stats brutes sans analyse IA
    return { hasEnoughData: true, stats, advice: null };
  }

  const weakDesc = stats.weakestType
    ? `${PRED_FR[stats.weakestType.name] || stats.weakestType.name} (${stats.weakestType.wins}/${stats.weakestType.total} gagnés)`
    : 'Non déterminé';

  const strongDesc = stats.strongestType
    ? `${PRED_FR[stats.strongestType.name] || stats.strongestType.name} (${stats.strongestType.wins}/${stats.strongestType.total} gagnés)`
    : 'Non déterminé';

  const prompt = `Tu es un coach expert en paris sportifs. Analyse le profil de ce parieur et donne 3 conseils personnalisés.

Statistiques du joueur (sur ${stats.total} paris) :
- Taux de réussite global : ${stats.winRate}%
- ROI : ${stats.roi}%
- Cote moyenne jouée : ${stats.avgOdds}
- Paris gagnés / perdus : ${stats.wins} / ${stats.losses}
- Marché le plus faible : ${weakDesc}
- Marché le plus fort : ${strongDesc}

Réponds avec ce JSON :
{
  "summary": "Résumé du profil en 1 phrase (ton bienveillant)",
  "tips": [
    {"title": "Conseil 1 court", "detail": "Explication en 1-2 phrases"},
    {"title": "Conseil 2 court", "detail": "Explication en 1-2 phrases"},
    {"title": "Conseil 3 court", "detail": "Explication en 1-2 phrases"}
  ],
  "score": 65
}

score = note globale du parieur de 0 à 100. Sois bienveillant mais honnête. Tout en français.`;

  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      // 500 tokens suffisaient rarement à boucler le JSON (résumé + 3 conseils
      // détaillés + score) en français — la réponse était coupée avant la
      // accolade fermante, JSON.parse échouait, et on retombait ici en
      // silence sur advice: null. Marge relevée pour laisser la réponse
      // se terminer proprement.
      max_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    });

    const stopReason = resp.stop_reason;
    const text = (resp.content[0]?.text || '').trim();
    const json = text.match(/\{[\s\S]*\}/);
    if (!json) {
      console.error('[Coach] Pas de JSON dans la réponse Claude (stop_reason:', stopReason, ') texte:', text.slice(0, 300));
      return { hasEnoughData: true, stats, advice: null };
    }

    let advice;
    try {
      advice = JSON.parse(json[0]);
    } catch (parseErr) {
      console.error('[Coach] JSON invalide (stop_reason:', stopReason, '):', parseErr.message, '—', json[0].slice(0, 300));
      return { hasEnoughData: true, stats, advice: null };
    }

    return { hasEnoughData: true, stats, advice };
  } catch (err) {
    console.error('[Coach] Erreur Claude:', err.message);
    return { hasEnoughData: true, stats, advice: null };
  }
}

module.exports = { getPersonalCoaching };
