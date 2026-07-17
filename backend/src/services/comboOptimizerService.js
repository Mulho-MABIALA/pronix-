// ─── Optimiseur de Combinés IA — suggère les meilleurs picks pour un coupon ────
const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');
const prisma = require('../config/database');

let client = null;
try {
  if (env.ANTHROPIC_API_KEY) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
} catch { /* SDK absent */ }

const PRED_FR = {
  HOME_WIN: '1 (Victoire domicile)', DRAW: 'X (Match nul)', AWAY_WIN: '2 (Victoire extérieur)',
  OVER_2_5: 'Plus de 2.5 buts', UNDER_2_5: 'Moins de 2.5 buts',
  BTTS_YES: 'Les 2 équipes marquent', BTTS_NO: 'BTTS Non',
};

const DEFAULT_ODDS = {
  HOME_WIN: 1.70, DRAW: 3.20, AWAY_WIN: 2.10,
  OVER_2_5: 1.80, UNDER_2_5: 1.90, BTTS_YES: 1.75, BTTS_NO: 2.00,
};

async function optimizeCombo(matchIds, strategy = 'balanced') {
  if (!client) {
    return { success: false, message: 'Service IA indisponible.' };
  }

  if (!matchIds || matchIds.length < 2) {
    return { success: false, message: 'Sélectionnez au moins 2 matchs.' };
  }

  // Récupère les matchs depuis la DB
  const matches = await prisma.match.findMany({
    where: { id: { in: matchIds } },
    include: { competition: true },
  });

  if (matches.length === 0) {
    return { success: false, message: 'Matchs introuvables.' };
  }

  const matchList = matches.map((m) => {
    const oddsLine = m.homeOdds
      ? `Cotes: 1=${m.homeOdds} X=${m.drawOdds} 2=${m.awayOdds}`
      : '';
    return `- ${m.homeTeam} vs ${m.awayTeam} (${m.competition?.name || '?'}) ${oddsLine}`;
  }).join('\n');

  const strategyDesc = {
    safe:       'Privilégie les pronostics les plus sûrs (cotes basses, confiance maximale)',
    balanced:   'Équilibre entre sécurité et gain potentiel (cotes moyennes)',
    ambitious:  'Maximise la cote totale en acceptant plus de risques',
  }[strategy] || 'Équilibre entre sécurité et gain potentiel';

  const prompt = `Tu es un expert en optimisation de combinés football. Analyse ces matchs et suggère les meilleurs picks.

Stratégie demandée : ${strategyDesc}

Matchs disponibles :
${matchList}

Réponds UNIQUEMENT avec ce JSON valide :
{
  "picks": [
    {
      "homeTeam": "Nom équipe domicile",
      "awayTeam": "Nom équipe extérieur",
      "prediction": "HOME_WIN|DRAW|AWAY_WIN|OVER_2_5|UNDER_2_5|BTTS_YES|BTTS_NO",
      "reasoning": "Pourquoi ce pick (1 phrase)"
    }
  ],
  "globalReasoning": "Explication globale du combiné en 1-2 phrases",
  "riskLevel": "LOW|MEDIUM|HIGH"
}

Inclus TOUS les matchs. Choisis le meilleur marché pour chaque match selon la stratégie.`;

  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (resp.content[0]?.text || '').trim();
    const json = text.match(/\{[\s\S]*\}/);
    if (!json) return { success: false, message: 'Réponse IA invalide.' };

    const result = JSON.parse(json[0]);
    const validPreds = ['HOME_WIN','DRAW','AWAY_WIN','OVER_2_5','UNDER_2_5','BTTS_YES','BTTS_NO'];

    // Mappe les picks aux IDs de match
    const optimizedEntries = result.picks
      .map((pick) => {
        const match = matches.find(
          (m) =>
            m.homeTeam.toLowerCase().includes(pick.homeTeam?.toLowerCase() || '') ||
            m.awayTeam.toLowerCase().includes(pick.awayTeam?.toLowerCase() || '')
        );
        if (!match) return null;
        const pred = validPreds.includes(pick.prediction) ? pick.prediction : 'HOME_WIN';
        return {
          matchId: match.id,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          prediction: pred,
          predictionLabel: PRED_FR[pred],
          odds: match.homeOdds
            ? pred === 'HOME_WIN' ? match.homeOdds
              : pred === 'DRAW' ? match.drawOdds
              : pred === 'AWAY_WIN' ? match.awayOdds
              : DEFAULT_ODDS[pred]
            : DEFAULT_ODDS[pred],
          reasoning: pick.reasoning || '',
        };
      })
      .filter(Boolean);

    const totalOdds = optimizedEntries.reduce((acc, e) => acc * (e.odds || 1), 1);

    return {
      success: true,
      entries: optimizedEntries,
      totalOdds: parseFloat(totalOdds.toFixed(2)),
      globalReasoning: result.globalReasoning || '',
      riskLevel: result.riskLevel || 'MEDIUM',
      strategy,
    };
  } catch (err) {
    console.error('[ComboOptimizer] Erreur Claude:', err.message);
    return { success: false, message: 'Erreur lors de l\'optimisation.' };
  }
}

module.exports = { optimizeCombo };
