const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');

let client = null;

function getClient() {
  if (!client && env.ANTHROPIC_API_KEY) {
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return client;
}

const VALID_PREDICTIONS = ['HOME_WIN', 'DRAW', 'AWAY_WIN', 'OVER_2_5', 'UNDER_2_5', 'BTTS_YES', 'BTTS_NO'];

function formatForm(matches) {
  if (!matches || matches.length === 0) return 'Aucune donnée disponible';
  return matches.map((m) => {
    const result = m.result || '?';
    return `  ${result} | ${m.homeTeam} ${m.homeScore ?? '?'}-${m.awayScore ?? '?'} ${m.awayTeam}`;
  }).join('\n');
}

function formatH2H(matches) {
  if (!matches || matches.length === 0) return 'Aucune confrontation disponible';
  return matches.map((m) =>
    `  ${m.homeTeam} ${m.homeScore}-${m.awayScore} ${m.awayTeam}`
  ).join('\n');
}

// Simulation locale basée sur la forme des équipes (utilisée sans crédits API)
function generateMockPrediction({ match, homeForm, awayForm, h2h }) {
  const score = (form) => {
    if (!form || form.length === 0) return 0;
    return form.reduce((acc, m) => {
      if (m.result === 'W') return acc + 3;
      if (m.result === 'D') return acc + 1;
      return acc;
    }, 0);
  };

  const homeScore = score(homeForm);
  const awayScore = score(awayForm);
  const diff = homeScore - awayScore;

  let prediction, confidence, analysis;

  if (diff >= 6) {
    prediction = 'HOME_WIN';
    confidence = 4;
    analysis = `${match.homeTeam} est en excellente forme avec ${homeForm.filter(m => m.result === 'W').length} victoires sur les 5 derniers matchs. À domicile, l'équipe dispose d'un avantage certain face à ${match.awayTeam} dont la forme récente est moins convaincante. Pronostic en faveur de l'équipe locale.`;
  } else if (diff >= 3) {
    prediction = 'HOME_WIN';
    confidence = 3;
    analysis = `${match.homeTeam} présente une meilleure forme récente que ${match.awayTeam}. L'avantage du terrain combiné à des performances solides laisse présager une victoire à domicile, même si le match pourrait être serré.`;
  } else if (diff <= -6) {
    prediction = 'AWAY_WIN';
    confidence = 4;
    analysis = `${match.awayTeam} est en grande forme avec ${awayForm.filter(m => m.result === 'W').length} victoires récentes, contre une équipe de ${match.homeTeam} en difficulté. Les visiteurs semblent clairement favoris pour ce déplacement.`;
  } else if (diff <= -3) {
    prediction = 'AWAY_WIN';
    confidence = 3;
    analysis = `${match.awayTeam} affiche de meilleures performances récentes. Malgré le déplacement, l'équipe visiteuse semble en mesure d'aller chercher les trois points face à ${match.homeTeam}.`;
  } else if (h2h && h2h.length >= 3) {
    const draws = h2h.filter(m => m.homeScore === m.awayScore).length;
    if (draws >= 2) {
      prediction = 'DRAW';
      confidence = 3;
      analysis = `L'historique des confrontations directes entre ${match.homeTeam} et ${match.awayTeam} montre une tendance au partage des points (${draws} nuls sur ${h2h.length} matchs). Les deux équipes sont équilibrées et un match nul est plausible.`;
    } else {
      prediction = 'OVER_2_5';
      confidence = 3;
      analysis = `Les rencontres entre ${match.homeTeam} et ${match.awayTeam} sont souvent ouvertes. Avec des équipes aux niveaux proches, on peut s'attendre à un match disputé avec plusieurs buts.`;
    }
  } else {
    prediction = 'DRAW';
    confidence = 2;
    analysis = `Les deux équipes présentent une forme similaire. Sans avantage notable d'un côté comme de l'autre, le match nul est l'issue la plus probable entre ${match.homeTeam} et ${match.awayTeam}.`;
  }

  return { prediction, confidence, analysis, _mock: true };
}

async function generateMatchPrediction({ match, homeForm, awayForm, h2h }) {
  const anthropic = getClient();
  if (!anthropic) {
    console.warn('[Claude] Pas de clé API — mode simulation');
    return generateMockPrediction({ match, homeForm, awayForm, h2h });
  }

  const matchDate = new Date(match.scheduledAt).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const prompt = `Tu es un expert en analyse football. Génère un pronostic précis et argumenté pour ce match.

MATCH : ${match.homeTeam} vs ${match.awayTeam}
COMPÉTITION : ${match.competition?.name || 'Non précisée'}
DATE : ${matchDate}

FORME RÉCENTE — ${match.homeTeam} (5 derniers matchs, W=victoire D=nul L=défaite) :
${formatForm(homeForm, match.homeTeam)}

FORME RÉCENTE — ${match.awayTeam} (5 derniers matchs) :
${formatForm(awayForm, match.awayTeam)}

CONFRONTATIONS DIRECTES (H2H) :
${formatH2H(h2h)}

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte avant ou après :
{
  "prediction": "HOME_WIN" | "DRAW" | "AWAY_WIN" | "OVER_2_5" | "UNDER_2_5" | "BTTS_YES" | "BTTS_NO",
  "confidence": entier entre 1 et 5,
  "analysis": "2 à 3 phrases en français expliquant les raisons clés du pronostic"
}`;

  let text;
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });
    text = message.content[0]?.text?.trim();
  } catch (err) {
    // Pas de crédits ou quota dépassé → simulation
    const isNoCredit = err?.status === 402 || err?.status === 529
      || String(err?.message).toLowerCase().includes('credit')
      || String(err?.message).toLowerCase().includes('quota');
    if (isNoCredit) {
      console.warn('[Claude] Crédits insuffisants — mode simulation activé');
      return generateMockPrediction({ match, homeForm, awayForm, h2h });
    }
    throw err;
  }

  if (!text) return generateMockPrediction({ match, homeForm, awayForm, h2h });

  let result;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Aucun JSON trouvé');
    result = JSON.parse(jsonMatch[0]);
  } catch {
    return generateMockPrediction({ match, homeForm, awayForm, h2h });
  }

  if (!VALID_PREDICTIONS.includes(result.prediction)) {
    return generateMockPrediction({ match, homeForm, awayForm, h2h });
  }
  result.confidence = Math.max(1, Math.min(5, Math.round(Number(result.confidence) || 3)));
  result.analysis = String(result.analysis || '').slice(0, 500);

  return result;
}

module.exports = { generateMatchPrediction };
