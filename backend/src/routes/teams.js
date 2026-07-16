const { Router } = require('express');
const { getTeam, getSquad, getTeamFixtures } = require('../controllers/teamController');

const router = Router();

// Public — proxy vers API-Football avec cache 1h
router.get('/:id',          getTeam);
router.get('/:id/squad',    getSquad);
router.get('/:id/fixtures', getTeamFixtures);

module.exports = router;
