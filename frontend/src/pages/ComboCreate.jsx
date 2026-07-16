import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Search, Plus, X, TrendingUp, Layers, Crown, ChevronDown, ChevronUp, Loader2, Info } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const PREDICTIONS = [
  { value: 'HOME_WIN',  label: '1', full: 'Victoire Dom.' },
  { value: 'DRAW',      label: 'X', full: 'Match nul' },
  { value: 'AWAY_WIN',  label: '2', full: 'Victoire Ext.' },
  { value: 'OVER_2_5',  label: '+2.5', full: 'Plus de 2.5' },
  { value: 'UNDER_2_5', label: '-2.5', full: 'Moins de 2.5' },
  { value: 'BTTS_YES',  label: 'BTTS', full: 'Les 2 marquent' },
  { value: 'BTTS_NO',   label: 'BTTS Non', full: 'Pas les 2' },
];

// Cote suggérée selon le type de pari
const SUGGESTED_ODDS = {
  HOME_WIN: 1.70, DRAW: 3.20, AWAY_WIN: 2.10,
  OVER_2_5: 1.80, UNDER_2_5: 1.90, BTTS_YES: 1.75, BTTS_NO: 2.00,
};

function MatchSelector({ onAdd, selectedIds }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['matches-for-combo'],
    queryFn: () => api.get('/matches?status=UPCOMING&limit=80').then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });

  const matches = data?.data || [];
  const filtered = useMemo(() => {
    if (!search.trim()) return matches.slice(0, 20);
    const q = search.toLowerCase();
    return matches.filter(
      (m) =>
        m.homeTeam?.toLowerCase().includes(q) ||
        m.awayTeam?.toLowerCase().includes(q) ||
        m.competition?.name?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [matches, search]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-surface-600 bg-surface-700 text-sm text-gray-300 hover:border-primary-500 transition-colors"
      >
        <Search size={14} className="text-gray-500" />
        <span className="flex-1 text-left">Rechercher un match…</span>
        {open ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
      </button>

      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-xl border border-surface-600 bg-surface-800 shadow-xl max-h-72 overflow-y-auto">
          <div className="sticky top-0 bg-surface-800 p-2 border-b border-surface-700">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Équipe, compétition…"
              className="w-full bg-surface-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
            />
          </div>
          {filtered.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-4">Aucun match trouvé</p>
          )}
          {filtered.map((m) => {
            const already = selectedIds.includes(m.id);
            return (
              <button
                key={m.id}
                disabled={already}
                onClick={() => { onAdd(m); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-3 py-2.5 hover:bg-surface-700 transition-colors border-b border-surface-700/50 last:border-0 ${
                  already ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <p className="text-sm text-gray-200 font-medium">
                  {m.homeTeam} vs {m.awayTeam}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {m.competition?.name} · {format(new Date(m.matchDate || m.scheduledAt), 'dd MMM HH:mm', { locale: fr })}
                </p>
                {already && <span className="text-xs text-primary-400">Déjà ajouté</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EntryRow({ entry, onUpdate, onRemove }) {
  return (
    <div className="bento-card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-200 truncate">
            {entry.match.homeTeam} vs {entry.match.awayTeam}
          </p>
          <p className="text-xs text-gray-500">
            {entry.match.competition?.name}
            {entry.match.matchDate && (
              <> · {format(new Date(entry.match.matchDate), 'dd MMM HH:mm', { locale: fr })}</>
            )}
          </p>
        </div>
        <button
          onClick={() => onRemove(entry.match.id)}
          className="p-1 text-gray-600 hover:text-red-400 transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Prediction picker */}
      <div className="grid grid-cols-4 gap-1.5">
        {PREDICTIONS.map((p) => (
          <button
            key={p.value}
            onClick={() => onUpdate(entry.match.id, { prediction: p.value, odds: SUGGESTED_ODDS[p.value] })}
            className={`py-1 px-1 rounded-lg text-[11px] font-semibold text-center transition-colors ${
              entry.prediction === p.value
                ? 'bg-primary-500 text-white'
                : 'bg-surface-700 text-gray-400 hover:bg-surface-600'
            }`}
            title={p.full}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Odds input */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 whitespace-nowrap">Cote :</label>
        <input
          type="number"
          value={entry.odds}
          min={1.01}
          max={50}
          step={0.05}
          onChange={(e) => onUpdate(entry.match.id, { odds: parseFloat(e.target.value) || 1 })}
          className="w-24 bg-surface-700 border border-surface-600 rounded-lg px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-primary-500"
        />
        <span className="text-xs text-gray-600">Cote suggérée automatiquement</span>
      </div>
    </div>
  );
}

export default function ComboCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [entries, setEntries] = useState([]); // [{match, prediction, odds}]

  // Cote totale
  const totalOdds = useMemo(
    () => entries.reduce((acc, e) => acc * (e.odds || 1), 1),
    [entries]
  );

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/combos', {
        title: title.trim() || undefined,
        isPremium,
        entries: entries.map((e) => ({
          matchId: e.match.id,
          prediction: e.prediction,
          odds: e.odds,
        })),
      }),
    onSuccess: (res) => {
      addToast('Combiné créé avec succès ! 🎯', 'success');
      navigate(`/combos/${res.data.data.id}`);
    },
    onError: (err) => {
      addToast(err.response?.data?.message || 'Erreur lors de la création', 'error');
    },
  });

  const addMatch = (match) => {
    setEntries((prev) => [
      ...prev,
      { match, prediction: 'HOME_WIN', odds: SUGGESTED_ODDS.HOME_WIN },
    ]);
  };

  const updateEntry = (matchId, changes) => {
    setEntries((prev) =>
      prev.map((e) => (e.match.id === matchId ? { ...e, ...changes } : e))
    );
  };

  const removeEntry = (matchId) => {
    setEntries((prev) => prev.filter((e) => e.match.id !== matchId));
  };

  const canSubmit = entries.length >= 2 && entries.every((e) => e.prediction && e.odds >= 1.01);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-gray-400">Connectez-vous pour créer un combiné.</p>
        <a href="/connexion" className="inline-block px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold">
          Se connecter
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-100">Créer un combiné</h1>
        <p className="text-gray-500 text-sm mt-0.5">Sélectionnez entre 2 et 15 matchs pour composer votre coupon</p>
      </div>

      {/* ── Titre ── */}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Titre du combiné (optionnel)</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 80))}
          placeholder="Ex : Combo Ligue 1 du week-end"
          className="w-full bg-surface-700 border border-surface-600 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500"
        />
      </div>

      {/* ── Sélection des matchs ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-200">
            Sélections
            {entries.length > 0 && (
              <span className="ml-2 text-xs text-gray-500">({entries.length}/15)</span>
            )}
          </label>
          {entries.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm font-bold text-primary-400">
              <TrendingUp size={13} />
              Cote totale : {totalOdds.toFixed(2)}
            </div>
          )}
        </div>

        <MatchSelector
          onAdd={addMatch}
          selectedIds={entries.map((e) => e.match.id)}
        />

        {entries.length === 0 && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-800 border border-dashed border-surface-600">
            <Info size={14} className="text-gray-600 shrink-0" />
            <p className="text-xs text-gray-500">
              Recherchez des matchs à venir et ajoutez-les à votre combiné
            </p>
          </div>
        )}

        {entries.map((entry) => (
          <EntryRow
            key={entry.match.id}
            entry={entry}
            onUpdate={updateEntry}
            onRemove={removeEntry}
          />
        ))}
      </div>

      {/* ── Options ── */}
      {(user?.role === 'ADMIN' || user?.isTipster) && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-800">
          <Crown size={15} className="text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-gray-200 font-medium">Combiné Premium</p>
            <p className="text-xs text-gray-500">Visible uniquement pour les abonnés</p>
          </div>
          <button
            onClick={() => setIsPremium((v) => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors ${isPremium ? 'bg-amber-500' : 'bg-surface-600'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isPremium ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      )}

      {/* ── Récap + Submit ── */}
      {entries.length >= 2 && (
        <div className="bento-card bg-primary-500/5 border-primary-500/20 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Layers size={13} /> {entries.length} sélections
            </span>
            <span className="font-bold text-primary-400 text-lg">
              Cote × {totalOdds.toFixed(2)}
            </span>
          </div>
          <div className="space-y-1">
            {entries.map((e) => (
              <div key={e.match.id} className="flex justify-between text-xs text-gray-500">
                <span className="truncate">{e.match.homeTeam} vs {e.match.awayTeam}</span>
                <span className="shrink-0 ml-2 font-medium text-gray-400">
                  {PREDICTIONS.find((p) => p.value === e.prediction)?.label || e.prediction}
                  {' '}@ {e.odds.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => navigate('/combos')}
          className="flex-1 py-3 rounded-xl border border-surface-600 text-gray-400 text-sm font-medium hover:bg-surface-700 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={() => createMutation.mutate()}
          disabled={!canSubmit || createMutation.isPending}
          className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-400 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {createMutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Plus size={16} />
              Publier le combiné
            </>
          )}
        </button>
      </div>

      {entries.length > 0 && entries.length < 2 && (
        <p className="text-xs text-gray-600 text-center">Ajoutez au moins 2 matchs pour publier</p>
      )}
    </div>
  );
}
