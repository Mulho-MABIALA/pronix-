/**
 * Cron agents IA — planifie l'exécution automatique de l'équipe d'agents
 * Intégré dans le système cron existant du projet
 */
const cron = require('node-cron');
const { lancerAgent } = require('../agents/orchestrateur');

function startAgentsCron() {
  // Agent Contenu — tous les matins à 7h00 (heure Dakar = UTC)
  cron.schedule('0 7 * * *', async () => {
    console.log('[Cron Agents] Agent Contenu : génération posts du jour');
    try {
      const result = await lancerAgent('contenu');
      console.log(`[Cron Agents] Contenu généré — ${result.matchesCount ?? 0} matchs couverts`);
    } catch (err) {
      console.error('[Cron Agents] Erreur Agent Contenu:', err.message);
    }
  }, { timezone: 'Africa/Dakar' });

  // Agent Analyse — chaque lundi à 8h00 pour le bilan de la semaine
  cron.schedule('0 8 * * 1', async () => {
    console.log('[Cron Agents] Agent Analyse : classement tipsters hebdomadaire');
    try {
      const result = await lancerAgent('analyse');
      console.log(`[Cron Agents] Analyse terminée — ${result.tipstersAnalysés ?? 0} tipsters traités`);
    } catch (err) {
      console.error('[Cron Agents] Erreur Agent Analyse:', err.message);
    }
  }, { timezone: 'Africa/Dakar' });

  // Agent SEO — tous les jours à 6h00 pour le dernier match terminé
  cron.schedule('0 6 * * *', async () => {
    console.log('[Cron Agents] Agent SEO : contenu page match');
    try {
      const result = await lancerAgent('seo');
      console.log(`[Cron Agents] SEO généré — match : ${result.match ?? 'N/A'}`);
    } catch (err) {
      console.error('[Cron Agents] Erreur Agent SEO:', err.message);
    }
  }, { timezone: 'Africa/Dakar' });

  console.log('[Cron Agents] Jobs agents IA planifiés (Contenu 7h, SEO 6h, Analyse lundi 8h)');
}

module.exports = { startAgentsCron };
