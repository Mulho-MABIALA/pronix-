/**
 * Orchestrateur — coordonne les agents IA selon la tâche demandée
 * Point d'entrée unique pour toute l'équipe d'agents
 */
const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');
const { runAgentContenu } = require('./agentContenu');
const { runAgentSEO } = require('./agentSEO');
const { runAgentAnalyse } = require('./agentAnalyse');
const { runAgentSupport } = require('./agentSupport');

// Définition des outils disponibles pour l'orchestrateur
const TOOLS = [
  {
    name: 'generer_contenu_social',
    description: 'Génère des posts WhatsApp et Facebook pour les matchs du jour',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'generer_contenu_seo',
    description: 'Génère du contenu SEO optimisé pour une page match',
    input_schema: {
      type: 'object',
      properties: {
        matchId: { type: 'string', description: 'ID du match (optionnel, prend le dernier terminé si absent)' },
      },
      required: [],
    },
  },
  {
    name: 'analyser_tipsters',
    description: 'Analyse les performances des tipsters et génère le classement hebdomadaire',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'repondre_support',
    description: 'Répond à une question d\'un utilisateur sur la plateforme',
    input_schema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'La question de l\'utilisateur' },
        userId: { type: 'string', description: 'ID de l\'utilisateur (optionnel)' },
      },
      required: ['question'],
    },
  },
];

async function executerOutil(nomOutil, parametres) {
  switch (nomOutil) {
    case 'generer_contenu_social':
      return runAgentContenu();
    case 'generer_contenu_seo':
      return runAgentSEO(parametres);
    case 'analyser_tipsters':
      return runAgentAnalyse();
    case 'repondre_support':
      return runAgentSupport(parametres);
    default:
      return { error: `Outil inconnu : ${nomOutil}` };
  }
}

/**
 * Orchestre les agents selon une instruction en langage naturel
 * @param {string} instruction - ex: "génère les posts du jour et analyse les tipsters"
 */
async function orchestrer(instruction) {
  if (!env.ANTHROPIC_API_KEY) {
    return { error: 'ANTHROPIC_API_KEY non configurée' };
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const resultats = {};
  const messages = [{ role: 'user', content: instruction }];

  // Boucle agentique — max 5 tours pour éviter les boucles infinies
  for (let tour = 0; tour < 5; tour++) {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2000,
      thinking: { type: 'adaptive' },
      system: `Tu es l'orchestrateur d'une équipe d'agents IA pour Statistique Foot SN.
Tu disposes de 4 agents spécialisés. Choisis les bons agents selon la demande.
Exécute les outils nécessaires puis synthétise les résultats en français.
Ne répète pas les données brutes — résume ce qui a été accompli.`,
      tools: TOOLS,
      messages,
    });

    // Vérifier si Claude veut utiliser des outils
    const toolUses = response.content.filter((b) => b.type === 'tool_use');

    if (toolUses.length === 0 || response.stop_reason === 'end_turn') {
      // Réponse finale
      const texte = response.content.find((b) => b.type === 'text')?.text || '';
      return { synthese: texte, resultats, tours: tour + 1 };
    }

    // Ajouter la réponse de l'assistant au fil de messages
    messages.push({ role: 'assistant', content: response.content });

    // Exécuter tous les outils demandés
    const toolResults = [];
    for (const toolUse of toolUses) {
      console.log(`[Orchestrateur] Lancement agent : ${toolUse.name}`);
      const resultat = await executerOutil(toolUse.name, toolUse.input);
      resultats[toolUse.name] = resultat;
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(resultat),
      });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  return { error: 'Nombre maximum de tours atteint', resultats };
}

/**
 * Exécute un agent directement sans passer par l'orchestrateur LLM
 */
async function lancerAgent(nomAgent, parametres = {}) {
  const map = {
    contenu: () => runAgentContenu(),
    seo: () => runAgentSEO(parametres),
    analyse: () => runAgentAnalyse(),
    support: () => runAgentSupport(parametres),
  };

  const fn = map[nomAgent];
  if (!fn) throw new Error(`Agent inconnu : ${nomAgent}. Valides : contenu, seo, analyse, support`);

  console.log(`[Agent] Lancement : ${nomAgent}`);
  const result = await fn();
  console.log(`[Agent] ${nomAgent} terminé`);
  return result;
}

module.exports = { orchestrer, lancerAgent };
