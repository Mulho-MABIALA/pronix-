import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Wallet, Trophy, TrendingUp, TrendingDown, Zap, Loader2, Info } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import { Link } from 'react-router-dom';

const PREDICTION_KEYS = ['HOME_WIN', 'DRAW', 'AWAY_WIN', 'OVER_2_5', 'UNDER_2_5', 'BTTS_YES', 'BTTS_NO'];

function ResultBadgeSimple({ result }) {
  const { t } = useTranslation();
  if (!result) return <span className="text-xs text-gray-500 bg-surface-700 px-2 py-0.5 rounded-full">{t('wallet.inProgress')}</span>;
  const map = {
    WIN:  { label: t('wallet.won'),      cls: 'text-green-400 bg-green-500/10' },
    LOSS: { label: t('wallet.lostBet'),  cls: 'text-red-400 bg-red-500/10' },
    VOID: { label: t('wallet.voided'),   cls: 'text-gray-400 bg-surface-700' },
  };
  const s = map[result] || map.VOID;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}

// ─── Place Bet Form ────────────────────────────────────────────────────────────
function PlaceBetForm({ balance, onSuccess }) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [matchId, setMatchId] = useState('');
  const [prediction, setPrediction] = useState('HOME_WIN');
  const [stake, setStake] = useState(100);
  const [odds, setOdds] = useState(1.80);

  const { data: matchesData } = useQuery({
    queryKey: ['upcoming-matches-wallet'],
    queryFn: () => api.get('/matches?status=UPCOMING&limit=30').then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });

  const placeMutation = useMutation({
    mutationFn: () => api.post('/wallet/bets', { matchId, prediction, odds: parseFloat(odds), stake: parseInt(stake) }),
    onSuccess: () => {
      addToast(t('wallet.betPlaced'), 'success');
      setMatchId('');
      setStake(100);
      queryClient.invalidateQueries({ queryKey: ['my-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['my-bets'] });
      onSuccess?.();
    },
    onError: (err) => {
      addToast(err.response?.data?.message || t('wallet.betError'), 'error');
    },
  });

  const matches = matchesData?.data || [];
  const potentialGain = Math.floor(stake * parseFloat(odds || 1));

  return (
    <div className="bento-card space-y-4">
      <div className="flex items-center gap-2">
        <Zap size={16} className="text-primary-400" />
        <h3 className="font-semibold text-gray-100">{t('wallet.placeBetTitle')}</h3>
      </div>

      {/* Match selector */}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">{t('wallet.matchLabel')}</label>
        <select
          value={matchId}
          onChange={(e) => setMatchId(e.target.value)}
          className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-primary-500"
        >
          <option value="">{t('wallet.selectMatch')}</option>
          {matches.map((m) => (
            <option key={m.id} value={m.id}>
              {m.homeTeam} vs {m.awayTeam} ({format(new Date(m.matchDate), 'dd MMM HH:mm', { locale: dateLocale })})
            </option>
          ))}
        </select>
      </div>

      {/* Prediction */}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">{t('wallet.predictionLabel')}</label>
        <div className="grid grid-cols-4 gap-2">
          {PREDICTION_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => setPrediction(k)}
              className={`py-1.5 px-1 rounded-lg text-xs font-medium transition-colors text-center ${
                prediction === k
                  ? 'bg-primary-500 text-white'
                  : 'bg-surface-700 text-gray-400 hover:bg-surface-600'
              }`}
            >
              {t(`wallet.predictions.${k}`, { defaultValue: k })}
            </button>
          ))}
        </div>
      </div>

      {/* Odds + Stake */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">{t('wallet.oddsLabel')}</label>
          <input
            type="number"
            value={odds}
            min={1.01}
            max={50}
            step={0.05}
            onChange={(e) => setOdds(e.target.value)}
            className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">{t('wallet.stakeLabel')}</label>
          <input
            type="number"
            value={stake}
            min={10}
            max={Math.min(balance, 10000)}
            step={10}
            onChange={(e) => setStake(e.target.value)}
            className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-primary-500"
          />
        </div>
      </div>

      {/* Gain potentiel */}
      <div className="flex items-center justify-between text-sm rounded-lg bg-surface-700 px-3 py-2">
        <span className="text-gray-400">{t('wallet.potentialGain')}</span>
        <span className="text-primary-400 font-bold">{potentialGain.toLocaleString('fr-FR')} pts</span>
      </div>

      <button
        onClick={() => placeMutation.mutate()}
        disabled={!matchId || !prediction || !stake || placeMutation.isPending || stake > balance}
        className="w-full py-2.5 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-400 transition-colors disabled:opacity-40"
      >
        {placeMutation.isPending ? <Loader2 size={16} className="animate-spin mx-auto" /> : t('wallet.betBtn')}
      </button>

      {stake > balance && (
        <p className="text-xs text-red-400 text-center">{t('wallet.stakeTooHigh')}</p>
      )}
    </div>
  );
}

// ─── Bet History ───────────────────────────────────────────────────────────────
function BetHistory() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  const { data, isLoading } = useQuery({
    queryKey: ['my-bets'],
    queryFn: () => api.get('/wallet/bets').then((r) => r.data),
  });

  const bets = data?.data || [];

  if (isLoading) return <SkeletonCard />;
  if (!bets.length) return <p className="text-gray-500 text-sm text-center py-6">{t('wallet.noBets')}</p>;

  return (
    <div className="space-y-2">
      {bets.map((bet) => (
        <div key={bet.id} className="bento-card flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">
              {bet.match?.homeTeam} vs {bet.match?.awayTeam}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t(`wallet.predictions.${bet.prediction}`, { defaultValue: bet.prediction })}
              {' '}· {t('wallet.oddsShort', { odds: bet.odds })}
              {' '}· {format(new Date(bet.createdAt), 'dd MMM', { locale: dateLocale })}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-gray-100">{bet.stake.toLocaleString('fr-FR')} pts</p>
            {bet.result === 'WIN' && bet.payout && (
              <p className="text-xs text-green-400">+{(bet.payout - bet.stake).toLocaleString('fr-FR')} pts</p>
            )}
            <div className="mt-0.5">
              <ResultBadgeSimple result={bet.result} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Leaderboard ───────────────────────────────────────────────────────────────
function Leaderboard() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['wallet-leaderboard'],
    queryFn: () => api.get('/wallet/leaderboard').then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });

  const leaders = data?.data || [];

  if (isLoading) return <SkeletonCard />;
  if (!leaders.length) return <p className="text-gray-500 text-sm text-center py-6">{t('wallet.noPlayers')}</p>;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-2">
      {leaders.map((entry, i) => (
        <div key={entry.id} className={`bento-card flex items-center gap-3 ${i < 3 ? 'border border-primary-500/20' : ''}`}>
          <span className="text-lg w-7 text-center shrink-0">{medals[i] || `${i + 1}`}</span>
          <div className="h-8 w-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-sm shrink-0">
            {(entry.user?.profile?.displayName || entry.user?.username || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">
              {entry.user?.profile?.displayName || entry.user?.username || t('wallet.player')}
            </p>
            <p className="text-xs text-gray-500">
              {t('wallet.ptsWon', { count: entry.totalWon.toLocaleString('fr-FR') })}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-primary-400">{entry.balance.toLocaleString('fr-FR')}</p>
            <p className="text-xs text-gray-500">pts</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function WalletPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState('pari');

  const { data: walletData, isLoading } = useQuery({
    queryKey: ['my-wallet'],
    queryFn: () => api.get('/wallet/me').then((r) => r.data),
    enabled: !!user,
  });

  const wallet = walletData?.data;

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <Wallet size={48} className="text-primary-400 mx-auto" />
        <h1 className="font-display font-bold text-2xl text-gray-100">{t('wallet.title')}</h1>
        <p className="text-gray-400">{t('wallet.loginPrompt')}</p>
        <Link to="/connexion" className="inline-block px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-400 transition-colors">
          {t('wallet.login')}
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <SkeletonCard className="h-28" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">

      {/* ── Solde header ── */}
      <div className="bento-card text-center space-y-1">
        <Wallet size={24} className="text-primary-400 mx-auto mb-2" />
        <p className="text-xs text-gray-500 uppercase tracking-wider">{t('wallet.virtualBalance')}</p>
        <p className="text-5xl font-display font-bold text-gray-100">
          {(wallet?.balance ?? 1000).toLocaleString('fr-FR')}
          <span className="text-lg text-gray-400 font-normal"> pts</span>
        </p>
        <div className="flex justify-center gap-6 pt-3">
          <div className="text-center">
            <div className="flex items-center gap-1 text-green-400 text-sm font-semibold">
              <TrendingUp size={13} />
              +{(wallet?.totalWon ?? 0).toLocaleString('fr-FR')}
            </div>
            <p className="text-xs text-gray-500">{t('wallet.totalWon')}</p>
          </div>
          <div className="w-px bg-surface-700" />
          <div className="text-center">
            <div className="flex items-center gap-1 text-red-400 text-sm font-semibold">
              <TrendingDown size={13} />
              -{(wallet?.totalLost ?? 0).toLocaleString('fr-FR')}
            </div>
            <p className="text-xs text-gray-500">{t('wallet.totalLost')}</p>
          </div>
        </div>
      </div>

      {/* ── Info disclaimer ── */}
      <div className="flex gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300">
          {t('wallet.simulationDisclaimer')}
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-surface-800 p-1 rounded-xl">
        {[
          { id: 'pari', labelKey: 'wallet.tabBet' },
          { id: 'historique', labelKey: 'wallet.tabHistory' },
          { id: 'classement', labelKey: 'wallet.tabLeaderboard' },
        ].map((tabDef) => (
          <button
            key={tabDef.id}
            onClick={() => setTab(tabDef.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === tabDef.id ? 'bg-surface-600 text-gray-100' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === tabDef.id && tabDef.id === 'classement' && <Trophy size={12} className="inline mr-1" />}
            {t(tabDef.labelKey)}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === 'pari' && (
        <PlaceBetForm balance={wallet?.balance ?? 0} onSuccess={() => setTab('historique')} />
      )}
      {tab === 'historique' && <BetHistory />}
      {tab === 'classement' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-yellow-400" />
            <h3 className="font-semibold text-gray-100">{t('wallet.leaderboardTitle')}</h3>
          </div>
          <Leaderboard />
        </div>
      )}

      <p className="disclaimer text-center">
        {t('wallet.finalDisclaimer')}
      </p>
    </div>
  );
}
