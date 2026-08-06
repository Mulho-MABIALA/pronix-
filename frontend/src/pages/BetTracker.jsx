import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, TrendingUp, Trash2, ChevronDown, ChevronUp, X, Check, Clock, Search, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { usePageMeta } from '../hooks/usePageMeta';
import { useToast } from '../context/ToastContext';
import CoachPanel from '../components/ai/CoachPanel';
import { TeamLogo } from '../components/matches/MatchCard';
import CompetitionLogo from '../components/ui/CompetitionLogo';

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const RESULT_STYLES = {
  WIN:  { text: 'text-primary-400', bg: 'bg-primary-500/10' },
  LOSS: { text: 'text-red-400',     bg: 'bg-red-500/10' },
  VOID: { text: 'text-ink-3',    bg: 'bg-overlay/[0.04]' },
};

function StatChip({ label, value, highlight }) {
  return (
    <div className="bento-card py-3 text-center">
      <p className={`text-xl font-display font-bold ${highlight || 'text-ink-1'}`}>{value}</p>
      <p className="text-xs text-ink-3 mt-0.5">{label}</p>
    </div>
  );
}

// Recherche un vrai match fpronix — impossible d'enregistrer un pari sur un
// match qui n'existe pas dans la base (voir betsController.js côté backend,
// qui de toute façon dérive teamA/teamB/matchDate du match choisi ici).
function MatchPicker({ selectedMatch, onSelect, onClear }) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const doSearch = useCallback(
    debounce(async (q) => {
      if (!q || q.length < 2) { setResults(null); setSearching(false); return; }
      setSearching(true);
      try {
        const { data } = await api.get(`/search?type=matches&status=upcoming&q=${encodeURIComponent(q)}`);
        setResults(data.data?.matches || []);
      } catch {
        setResults(null);
      } finally {
        setSearching(false);
      }
    }, 300),
    []
  );

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    doSearch(v);
  };

  if (selectedMatch) {
    return (
      <div className="flex items-center gap-3 bg-surface-700/40 border border-primary-500/30 rounded-xl px-3 py-2.5">
        <CompetitionLogo logo={selectedMatch.competition?.logo} size={22} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink-2 truncate flex items-center gap-1.5">
            <TeamLogo logo={selectedMatch.homeTeamLogo} teamId={selectedMatch.homeTeamId} name={selectedMatch.homeTeam} size={16} />
            {selectedMatch.homeTeam}
            <span className="text-ink-4 font-normal">vs</span>
            <TeamLogo logo={selectedMatch.awayTeamLogo} teamId={selectedMatch.awayTeamId} name={selectedMatch.awayTeam} size={16} />
            {selectedMatch.awayTeam}
          </p>
          <p className="text-[11px] text-ink-4 flex items-center gap-1 truncate mt-0.5">
            <CalendarClock size={11} className="shrink-0" />
            {selectedMatch.competition?.name ? `${selectedMatch.competition.name} · ` : ''}
            {format(new Date(selectedMatch.scheduledAt), 'dd MMM yyyy HH:mm', { locale: dateLocale })}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 text-[11px] font-semibold text-ink-3 hover:text-primary-400 px-2 py-1 rounded-lg transition-colors"
        >
          {t('bets.changeMatch')}
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-surface-700/40 border border-overlay/[0.07] rounded-xl px-3 py-2.5 focus-within:border-primary-500/40">
        <Search size={14} className="text-ink-4 shrink-0" />
        <input
          value={query}
          onChange={handleChange}
          placeholder={t('bets.searchMatchPlaceholder')}
          className="flex-1 bg-transparent text-sm text-ink-2 placeholder-ph-b outline-none"
          autoComplete="off"
        />
      </div>

      {query.length >= 2 && (
        <div className="absolute z-10 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-overlay/[0.08] bg-surface-800 shadow-2xl">
          {searching ? (
            <div className="px-3 py-3 text-center">
              <div className="w-4 h-4 border-2 border-primary-500/30 border-t-primary-400 rounded-full animate-spin mx-auto" />
            </div>
          ) : results && results.length > 0 ? (
            results.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { onSelect(m); setQuery(''); setResults(null); }}
                className="w-full flex items-center gap-2.5 text-left px-3 py-2.5 hover:bg-overlay/[0.05] transition-colors border-b border-overlay/[0.09] last:border-0"
              >
                <CompetitionLogo logo={m.competition?.logo} size={18} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink-2 truncate flex items-center gap-1.5">
                    <TeamLogo logo={m.homeTeamLogo} teamId={m.homeTeamId} name={m.homeTeam} size={15} />
                    {m.homeTeam}
                    <span className="text-ink-4">vs</span>
                    <TeamLogo logo={m.awayTeamLogo} teamId={m.awayTeamId} name={m.awayTeam} size={15} />
                    {m.awayTeam}
                  </p>
                  <p className="text-[11px] text-ink-4 truncate mt-0.5">
                    {m.competition?.name ? `${m.competition.name} · ` : ''}
                    {format(new Date(m.scheduledAt), 'dd MMM yyyy HH:mm', { locale: dateLocale })}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-center text-xs text-ink-3">
              {t('bets.noMatchFound')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function BetForm({ onClose, onSaved }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [form, setForm] = useState({
    prediction: '', odds: '', stake: '', notes: '', result: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMatch) return;
    setLoading(true);
    try {
      await api.post('/bets', {
        matchId: selectedMatch.id,
        prediction: form.prediction,
        odds: parseFloat(form.odds),
        stake: parseInt(form.stake, 10),
        result: form.result || undefined,
        notes: form.notes || undefined,
      });
      toast(t('bets.addedSuccess'), 'success');
      onSaved();
    } catch {
      toast(t('bets.addError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-surface-700/40 border border-overlay/[0.07] rounded-xl px-3 py-2.5 text-sm text-ink-2 placeholder-ph-b outline-none focus:border-primary-500/40';

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-[11px] text-ink-3 mb-1">{t('bets.matchLabel')}</label>
        <MatchPicker
          selectedMatch={selectedMatch}
          onSelect={setSelectedMatch}
          onClear={() => setSelectedMatch(null)}
        />
      </div>

      <div>
        <label className="block text-[11px] text-ink-3 mb-1">{t('bets.prediction')}</label>
        <input value={form.prediction} onChange={set('prediction')} required placeholder={t('bets.predictionPlaceholder')} className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] text-ink-3 mb-1">{t('bets.odds')}</label>
          <input type="number" step="0.01" min="1" value={form.odds} onChange={set('odds')} required placeholder="1.85" className={inputClass} />
        </div>
        <div>
          <label className="block text-[11px] text-ink-3 mb-1">{t('bets.stakeFcfa')}</label>
          <input type="number" min="1" value={form.stake} onChange={set('stake')} required placeholder="5000" className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-[11px] text-ink-3 mb-1">{t('bets.resultOptional')}</label>
        <select value={form.result} onChange={set('result')} className={inputClass}>
          <option value="">{t('bets.pending')}</option>
          <option value="WIN">{t('bets.results.WIN')}</option>
          <option value="LOSS">{t('bets.results.LOSS')}</option>
          <option value="VOID">{t('bets.results.VOID')}</option>
        </select>
      </div>

      <div>
        <label className="block text-[11px] text-ink-3 mb-1">{t('bets.notes')}</label>
        <textarea value={form.notes} onChange={set('notes')} placeholder={t('bets.notesPlaceholder')} rows={2} className={inputClass + ' resize-none'} />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('common.cancel')}</button>
        <button type="submit" disabled={loading || !selectedMatch} className="btn-cta flex-1">
          {loading ? '...' : t('common.save')}
        </button>
      </div>
    </form>
  );
}

function BetRow({ bet, onDelete, onResultChange }) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  const [expanded, setExpanded] = useState(false);
  const style = RESULT_STYLES[bet.result];
  const gain = bet.result === 'WIN' ? (bet.stake * bet.odds).toFixed(0) : null;

  return (
    <div className="bento-card space-y-2">
      <div className="flex items-center justify-between gap-2" onClick={() => setExpanded((v) => !v)}>
        {bet.match?.competition?.logo && (
          <CompetitionLogo logo={bet.match.competition.logo} size={20} className="shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-ink-2 truncate flex items-center gap-1.5">
            {/* Toujours affiché, même sans match lié (vieux paris créés avant
                que le choix d'un vrai match soit obligatoire) — TeamLogo
                retombe sur un avatar-initiale si logo/teamId sont absents. */}
            <TeamLogo logo={bet.match?.homeTeamLogo} teamId={bet.match?.homeTeamId} name={bet.teamA} size={14} />
            {bet.teamA}
            <span className="text-ink-4 font-normal">vs</span>
            <TeamLogo logo={bet.match?.awayTeamLogo} teamId={bet.match?.awayTeamId} name={bet.teamB} size={14} />
            {bet.teamB}
          </p>
          <p className="text-[11px] text-ink-3 truncate mt-0.5">
            {t('bets.rowSummary', { prediction: bet.prediction, odds: bet.odds, stake: bet.stake.toLocaleString('fr-FR') })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {style ? (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${style.bg} ${style.text}`}>
              {t(`bets.results.${bet.result}`)}
            </span>
          ) : (
            <span className="text-[11px] text-ink-4 flex items-center gap-1">
              <Clock size={11} /> {t('bets.pending')}
            </span>
          )}
          {expanded ? <ChevronUp size={14} className="text-ink-4" /> : <ChevronDown size={14} className="text-ink-4" />}
        </div>
      </div>

      {expanded && (
        <div className="pt-2 border-t border-overlay/[0.05] space-y-3">
          {gain && (
            <p className="text-sm text-primary-400">
              {t('bets.gain')} <strong>{parseInt(gain).toLocaleString('fr-FR')} FCFA</strong>
            </p>
          )}
          {bet.notes && (
            <p className="text-xs text-ink-3 leading-relaxed">{bet.notes}</p>
          )}
          <p className="text-[11px] text-ink-4">
            {format(new Date(bet.matchDate), 'dd MMM yyyy HH:mm', { locale: dateLocale })}
          </p>

          {/* Changer le résultat */}
          <div className="flex gap-2 flex-wrap">
            {['WIN', 'LOSS', 'VOID'].map((r) => (
              <button
                key={r}
                onClick={() => onResultChange(bet.id, r)}
                className={`text-[11px] font-semibold px-3 py-1 rounded-lg transition-colors ${
                  bet.result === r
                    ? `${RESULT_STYLES[r].bg} ${RESULT_STYLES[r].text} border border-current`
                    : 'text-ink-4 bg-surface-700/40 hover:text-ink-3'
                }`}
              >
                {t(`bets.results.${r}`)}
              </button>
            ))}
            <button
              onClick={() => onDelete(bet.id)}
              className="ml-auto text-[11px] text-red-500 hover:text-red-400 flex items-center gap-1"
            >
              <Trash2 size={12} /> {t('common.delete')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BetTracker() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('');

  usePageMeta(t('bets.metaTitle'), t('bets.metaDesc'));

  const { data, isLoading } = useQuery({
    queryKey: ['bets', filter],
    queryFn: () =>
      api.get(`/bets${filter ? `?result=${filter}` : ''}`).then((r) => r.data),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/bets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bets'] });
      queryClient.invalidateQueries({ queryKey: ['coach-advice'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, result }) => api.patch(`/bets/${id}`, { result }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bets'] });
      queryClient.invalidateQueries({ queryKey: ['coach-advice'] });
    },
  });

  const bets = data?.data || [];
  const stats = data?.stats || {};

  const handleDelete = async (id) => {
    await deleteMutation.mutateAsync(id);
    toast(t('bets.deletedSuccess'), 'info');
  };

  const handleResultChange = async (id, result) => {
    await updateMutation.mutateAsync({ id, result });
  };

  const FILTERS = [
    { value: '', label: t('bets.filterAll') },
    { value: 'WIN', label: t('bets.filterWon') },
    { value: 'LOSS', label: t('bets.filterLost') },
    { value: 'VOID', label: t('bets.filterVoided') },
  ];

  return (
    <div className="max-w-xl mx-auto px-4 py-5 space-y-5 pb-28 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-ink-1">{t('bets.title')}</h1>
          <p className="text-xs text-ink-3 mt-0.5">{t('bets.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-cta flex items-center gap-2 text-sm px-4"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? t('common.close') : t('bets.add')}
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {showForm && (
        <div className="bento-card">
          <h2 className="font-semibold text-ink-1 text-sm mb-4">{t('bets.newBet')}</h2>
          <BetForm
            onClose={() => setShowForm(false)}
            onSaved={() => {
              setShowForm(false);
              queryClient.invalidateQueries({ queryKey: ['bets'] });
              queryClient.invalidateQueries({ queryKey: ['coach-advice'] });
            }}
          />
        </div>
      )}

      {/* Statistiques */}
      {stats.settled > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatChip label={t('bets.staked')} value={`${(stats.totalStaked || 0).toLocaleString('fr-FR')} F`} />
          <StatChip label={t('bets.winRate')} value={`${Math.round(stats.winRate || 0)}%`} highlight="text-primary-400" />
          <StatChip
            label={t('bets.roi')}
            value={`${stats.roi >= 0 ? '+' : ''}${stats.roi?.toFixed(1)}%`}
            highlight={stats.roi >= 0 ? 'text-primary-400' : 'text-red-400'}
          />
        </div>
      )}

      {/* Coach Personnel IA */}
      <CoachPanel />

      {/* Filtres */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`filter-chip shrink-0 ${value === filter ? 'data-[active=true]:bg-select-500/15' : ''}`}
            data-active={filter === value}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bento-card h-16 animate-pulse bg-surface-700/40" />
          ))}
        </div>
      ) : bets.length === 0 ? (
        <div className="bento-card text-center py-14 space-y-3">
          <div className="text-5xl">📊</div>
          <p className="text-ink-3 font-semibold">{t('bets.noEntries')}</p>
          <p className="text-ink-3 text-sm">{t('bets.noEntriesDesc')}</p>
          <button onClick={() => setShowForm(true)} className="btn-cta inline-flex gap-2 mt-2">
            <Plus size={15} /> {t('bets.addFirstBet')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {bets.map((bet) => (
            <BetRow key={bet.id} bet={bet} onDelete={handleDelete} onResultChange={handleResultChange} />
          ))}
        </div>
      )}
    </div>
  );
}
