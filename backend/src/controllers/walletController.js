// Wallet fictif — gamification sans argent réel
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// Récupérer ou créer le wallet de l'utilisateur
async function getOrCreateWallet(userId) {
  let wallet = await prisma.virtualWallet.findUnique({ where: { userId } });
  if (!wallet) {
    wallet = await prisma.virtualWallet.create({
      data: { userId, balance: 1000 },
    });
  }
  return wallet;
}

// GET /api/wallet/me
async function getMyWallet(req, res, next) {
  try {
    const wallet = await getOrCreateWallet(req.user.id);

    const recentBets = await prisma.virtualBet.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        match: {
          select: {
            homeTeam: true, awayTeam: true,
            homeScore: true, awayScore: true,
            status: true, scheduledAt: true,
          },
        },
      },
    });

    const stats = {
      totalBets: recentBets.length,
      wins: recentBets.filter((b) => b.result === 'WIN').length,
      losses: recentBets.filter((b) => b.result === 'LOSS').length,
      pending: recentBets.filter((b) => !b.result).length,
      roi: wallet.totalLost > 0
        ? (((wallet.totalWon - wallet.totalLost) / wallet.totalLost) * 100).toFixed(1)
        : '0.0',
    };

    res.json({ success: true, data: { wallet, recentBets, stats } });
  } catch (err) { next(err); }
}

// POST /api/wallet/bets — placer un pari fictif
async function placeBet(req, res, next) {
  try {
    const { matchId, prediction, odds, stake } = req.body;

    if (!matchId || !prediction || !odds || !stake) {
      throw new AppError('matchId, prediction, odds et stake requis', 400, 'MISSING_FIELDS');
    }
    const stakeInt = parseInt(stake);
    if (stakeInt < 10 || stakeInt > 10000) {
      throw new AppError('La mise doit être entre 10 et 10 000 points', 400, 'INVALID_STAKE');
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, status: true, homeTeam: true, awayTeam: true },
    });
    if (!match) throw new AppError('Match introuvable', 404, 'NOT_FOUND');
    if (match.status === 'FINISHED' || match.status === 'CANCELLED') {
      throw new AppError('Ce match est terminé ou annulé', 400, 'MATCH_ENDED');
    }

    const wallet = await getOrCreateWallet(req.user.id);
    if (wallet.balance < stakeInt) {
      throw new AppError(`Solde insuffisant (${wallet.balance} points disponibles)`, 400, 'INSUFFICIENT_BALANCE');
    }

    // Vérifier pas de pari en double
    const existing = await prisma.virtualBet.findFirst({
      where: { walletId: wallet.id, matchId, result: null },
    });
    if (existing) {
      throw new AppError('Vous avez déjà un pari en cours sur ce match', 409, 'DUPLICATE_BET');
    }

    const [updatedWallet, bet] = await prisma.$transaction([
      prisma.virtualWallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: stakeInt } },
      }),
      prisma.virtualBet.create({
        data: {
          walletId: wallet.id,
          matchId,
          prediction,
          odds: parseFloat(odds),
          stake: stakeInt,
        },
        include: {
          match: { select: { homeTeam: true, awayTeam: true, scheduledAt: true } },
        },
      }),
    ]);

    res.status(201).json({
      success: true,
      data: { bet, newBalance: updatedWallet.balance },
      message: `Pari placé ! Gain potentiel : ${Math.round(stakeInt * parseFloat(odds))} points`,
    });
  } catch (err) { next(err); }
}

// GET /api/wallet/bets — historique des paris
async function listBets(req, res, next) {
  try {
    const wallet = await prisma.virtualWallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet) return res.json({ success: true, data: [] });

    const bets = await prisma.virtualBet.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        match: {
          select: {
            homeTeam: true, awayTeam: true, homeScore: true, awayScore: true,
            status: true, scheduledAt: true,
            competition: { select: { name: true } },
          },
        },
      },
    });

    res.json({ success: true, data: bets });
  } catch (err) { next(err); }
}

// GET /api/wallet/leaderboard — classement mensuel
async function getLeaderboard(req, res, next) {
  try {
    const topWallets = await prisma.virtualWallet.findMany({
      orderBy: [{ totalWon: 'desc' }, { balance: 'desc' }],
      take: 20,
      include: {
        user: {
          select: {
            id: true, username: true,
            profile: { select: { displayName: true, avatar: true } },
          },
        },
      },
    });

    const leaderboard = topWallets.map((w, i) => ({
      rank: i + 1,
      user: w.user,
      balance: w.balance,
      totalWon: w.totalWon,
      roi: w.totalLost > 0
        ? (((w.totalWon - w.totalLost) / w.totalLost) * 100).toFixed(1)
        : '0.0',
    }));

    res.json({ success: true, data: leaderboard });
  } catch (err) { next(err); }
}

// Méthode interne — résoudre les paris après un match terminé
async function resolveBetsForMatch(matchId, homeScore, awayScore) {
  try {
    const pendingBets = await prisma.virtualBet.findMany({
      where: { matchId, result: null },
      include: { wallet: true },
    });

    for (const bet of pendingBets) {
      const result = determineBetResult(bet.prediction, homeScore, awayScore);
      const payout = result === 'WIN' ? Math.round(bet.stake * bet.odds) : 0;

      await prisma.$transaction([
        prisma.virtualBet.update({
          where: { id: bet.id },
          data: { result, payout: result === 'WIN' ? payout : null },
        }),
        prisma.virtualWallet.update({
          where: { id: bet.walletId },
          data: {
            ...(result === 'WIN' ? {
              balance: { increment: payout },
              totalWon: { increment: payout },
            } : {}),
            ...(result === 'LOSS' ? {
              totalLost: { increment: bet.stake },
            } : {}),
          },
        }),
      ]);
    }
  } catch (e) {
    console.error('[Wallet] Erreur résolution paris:', e.message);
  }
}

function determineBetResult(prediction, homeScore, awayScore) {
  if (homeScore === null || awayScore === null) return null;
  const total = homeScore + awayScore;
  switch (prediction) {
    case 'HOME_WIN':   return homeScore > awayScore ? 'WIN' : 'LOSS';
    case 'AWAY_WIN':   return awayScore > homeScore ? 'WIN' : 'LOSS';
    case 'DRAW':       return homeScore === awayScore ? 'WIN' : 'LOSS';
    case 'OVER_2_5':   return total > 2.5 ? 'WIN' : 'LOSS';
    case 'UNDER_2_5':  return total < 2.5 ? 'WIN' : 'LOSS';
    case 'OVER_1_5':   return total > 1.5 ? 'WIN' : 'LOSS';
    case 'BTTS_YES':   return homeScore > 0 && awayScore > 0 ? 'WIN' : 'LOSS';
    case 'BTTS_NO':    return homeScore === 0 || awayScore === 0 ? 'WIN' : 'LOSS';
    default:           return 'VOID';
  }
}

module.exports = { getMyWallet, placeBet, listBets, getLeaderboard, resolveBetsForMatch };
