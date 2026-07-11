// Service de prédiction IA — utilise Claude (Haiku) quand l'historique est insuffisant
// Appelé par predictionService.js en second recours, avant le fallback aléatoire.
const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');

let client = null;
try {
  if (env.ANTHROPIC_API_KEY) {
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
} catch {
  // SDK absent ou clé invalide — on désactive silencieusement
}

/**
 * Génère une prédiction via Claude Haiku pour un match sans données statistiques.
 * @param {Object} match    — { homeTeam, awayTeam, scheduledAt, competition: { name } }
 * @param {Object} context  — { hasData, text } retourné par footballContextService (optionnel)
 * @returns {Object|null}   — prédictions au même format que predictionService, avec aiGenerated: true
 */
async function generateAIPrediction(match, context = null) {
  if (!client) return null;

  const competition = match.competition?.name || 'Compétition inconnue';
  const dateStr = match.scheduledAt
    ? new Date(match.scheduledAt).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Date inconnue';

  // Bloc de données temps réel (forme, H2H, classement, blessures)
  const contextBlock = context?.hasData
    ? `\n📊 Données temps réel :\n${context.text}\n`
    : '';

  const prompt = `Tu es un expert en analyse footballistique. Donne des probabilités réalistes pour ce match à venir.

Match : ${match.homeTeam} (domicile) vs ${match.awayTeam} (extérieur)
Compétition : ${competition}
Date : ${dateStr}
${contextBlock}
Réponds UNIQUEMENT avec ce JSON valide — aucun autre texte avant ou après :
{
  "home": <entier 10-75>,
  "draw": <entier 10-40>,
  "away": <entier 10-75>,
  "over25": <entier 25-75>,
  "over15": <entier 45-92>,
  "btts": <entier 25-70>,
  "reasoning": "<une phrase courte expliquant le pronostic favori, en français>"
}

Règles :
- home + draw + away ≈ 100 (±2 accepté)
- Si des données temps réel sont fournies, base-toi PRINCIPALEMENT sur elles
- Sans données : tiens compte du niveau des équipes si connu, sinon léger avantage domicile
- Si c'est une équipe réserve, amateur ou inconnue, utilise une distribution équilibrée`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 350,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (response.content[0]?.text || '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);

    // Valider et borner les valeurs
    const home   = Math.max(5,  Math.min(90, Math.round(Number(data.home   || 35))));
    const draw   = Math.max(5,  Math.min(50, Math.round(Number(data.draw   || 30))));
    const away   = Math.max(5,  Math.min(90, Math.round(Number(data.away   || 35))));
    const over25 = Math.max(20, Math.min(80, Math.round(Number(data.over25 || 50))));
    const over15 = Math.max(40, Math.min(95, Math.round(Number(data.over15 || 70))));
    const btts   = Math.max(20, Math.min(80, Math.round(Number(data.btts   || 48))));

    // Marchés dérivés
    const over35  = Math.max(5,  Math.round(over25 * 0.45));
    const dc1x    = Math.min(99, home + draw);
    const dc2x    = Math.min(99, away + draw);
    const dc12    = Math.min(99, home + away);

    const candidates = [
      { type: '1',       label: 'Victoire domicile',            prob: home },
      { type: 'X',       label: 'Match nul',                     prob: draw },
      { type: '2',       label: 'Victoire extérieur',            prob: away },
      { type: 'over25',  label: 'Plus de 2.5 buts',              prob: over25 },
      { type: 'over15',  label: 'Plus de 1.5 buts',              prob: over15 },
      { type: 'btts',    label: 'Les 2 équipes marquent',        prob: btts },
      { type: '1X',      label: 'Double chance 1X',              prob: dc1x },
      { type: 'X2',      label: 'Double chance X2',              prob: dc2x },
      { type: '12',      label: 'Double chance 12 (sans nul)',   prob: dc12 },
      { type: 'under25', label: 'Moins de 2.5 buts',             prob: 100 - over25 },
      { type: 'nobtts',  label: 'Les 2 équipes ne marquent pas', prob: 100 - btts },
      { type: 'over35',  label: 'Plus de 3.5 buts',              prob: over35 },
    ].sort((a, b) => b.prob - a.prob);

    const bestPick   = candidates[0];
    const confidence = bestPick.prob >= 72 ? 'high' : bestPick.prob >= 58 ? 'medium' : 'low';

    return {
      home, draw, away,
      over35, under35: 100 - over35,
      over25, over15, under25: 100 - over25, under15: 100 - over15,
      btts, nobtts: 100 - btts,
      dc1x, dc2x, dc12,
      bestPick,
      confidence,
      allPicks: candidates.slice(0, 5),
      sampleSize: 0,
      aiGenerated: true,
      aiReasoning: typeof data.reasoning === 'string' ? data.reasoning.slice(0, 200) : null,
      hasRealData: context?.hasData ?? false,
    };
  } catch (e) {
    console.error('[AI Prediction] Erreur:', e.message);
    return null;
  }
}

module.exports = { generateAIPrediction };
