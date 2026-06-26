/**
 * Routes API agents IA — accès admin uniquement
 * POST /api/agents/run/:nom  — lance un agent directement
 * POST /api/agents/orchestrer  — instruction en langage naturel
 * POST /api/agents/support  — question support (utilisateurs connectés)
 */
const express = require('express');
const router = express.Router();
const { lancerAgent, orchestrer } = require('../agents/orchestrateur');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Support : tous les utilisateurs connectés peuvent poser une question
router.post('/support', authenticate, async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string' || question.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'Question requise (min 3 caractères)' });
  }

  try {
    const result = await lancerAgent('support', { question: question.trim(), userId: req.user.id });
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[API Agents] Erreur support:', err.message);
    return res.status(500).json({ success: false, message: 'Erreur agent support' });
  }
});

// Routes admin : lancer un agent nommé
router.post('/run/:nom', authenticate, requireAdmin, async (req, res) => {
  const { nom } = req.params;
  const parametres = req.body || {};

  const agentsValides = ['contenu', 'seo', 'analyse', 'support'];
  if (!agentsValides.includes(nom)) {
    return res.status(400).json({
      success: false,
      message: `Agent inconnu. Valides : ${agentsValides.join(', ')}`,
    });
  }

  try {
    const result = await lancerAgent(nom, parametres);
    return res.json({ success: true, agent: nom, data: result });
  } catch (err) {
    console.error(`[API Agents] Erreur agent ${nom}:`, err.message);
    return res.status(500).json({ success: false, message: `Erreur agent ${nom}` });
  }
});

// Orchestration libre en langage naturel (admin)
router.post('/orchestrer', authenticate, requireAdmin, async (req, res) => {
  const { instruction } = req.body;
  if (!instruction) {
    return res.status(400).json({ success: false, message: 'Instruction requise' });
  }

  try {
    const result = await orchestrer(instruction);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[API Agents] Erreur orchestrateur:', err.message);
    return res.status(500).json({ success: false, message: 'Erreur orchestrateur' });
  }
});

module.exports = router;
