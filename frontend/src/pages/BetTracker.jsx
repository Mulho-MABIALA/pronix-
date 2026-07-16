import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, TrendingUp, Trash2, ChevronDown, ChevronUp, X, Check, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { usePageMeta } from '../hooks/usePageMeta';
import { useToast } from '../context/ToastContext';

const RESULT_COLORS = {
  WIN:  { text: 'text-primary-400', bg: 'bg-primary-500/10', label: 'Gagné' },
  LOSS: { text: 'text-red-400',     bg: 'bg-red-500/10',     label: 'Perdu' },
  VOID: { text: 'text-gray-500',    bg: 'bg-white/[0.04]',   label: 'Annulé' },
};

function StatChip({ label, value, highlight }) {
  return (
    <div className="bento-card py-3 text-center">
      <p className={`text-xl font-display font-bold ${highlight || 'text-gray-100'}`}>{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function BetForm({ onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    teamA: '', teamB: '', prediction: '',
    odds: '', stake: '', matchDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    notes: '', result: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/bets', {
        ...form,
        odds: parseFloat(form.odds),
        stake: parseInt(form.stake, 10),
        matchDate: new Date(form.matchDate).toISOString(),
        result: form.result || undefined,
      });
      toast('Paris ajouté !', 'success');
      onSaved();
    } catch {
      toast('Erreur lors de l\'ajout', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-surface-700/40 border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-primary-500/40';

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Équipe dom.</label>
          <input value={form.teamA} onChange={set('teamA')} required placeholder="PSG" className={inputClass} />
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Équipe ext.</label>
          <input value={form.teamB} onChange={set('teamB')} required placeholder="OM" className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Pronostic</label>
        <input value={form.prediction} onChange={set('prediction')} required placeholder="Victoire domicile, +2.5 buts..." className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Cote</label>
          <input type="number" step="0.01" min="1" value={form.odds} onChange={set('odds')} required placeholder="1.85" className={inputClass} />
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Mise (FCFA)</label>
          <input type="number" min="1" value={form.stake} onChange={set('stake')} required placeholder="5000" className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Date & heure</label>
        <input type="datetime-local" value={form.matchDate} onChange={set('matchDate')} required className={inputClass} />
      </div>

      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Résultat (optionnel)</label>
        <select value={form.result} onChange={set('result')} className={inputClass}>
          <option value="">En attente</option>
          <option value="WIN">Gagné</option>
          <option value="LOSS">Perdu</option>
          <option value="VOID">Annulé</option>
        </select>
      </div>

      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Notes</label>
        <textarea value={form.notes} onChange={set('notes')} placeholder="Analyse, raison du pick..." rows={2} className={inputClass + ' resize-none'} />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
        <button type="submit" disabled={loading} className="btn-cta flex-1">
          {loading ? '...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}

function BetRow({ bet, onDelete, onResultChange }) {
  const [expanded, setExpanded] = useState(false);
  const res = RESULT_COLORS[bet.result];
  const gain = bet.result === 'WIN' ? (bet.stake * bet.odds).toFixed(0) : null;

  return (
    <div className="bento-card space-y-2">
      <div className="flex items-center justify-between gap-2" onClick={() => setExpanded((v) => !v)}>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-200 truncate">
            {bet.teamA} vs {bet.teamB}
          </p>
          <p className="text-[11px] text-gray-500 truncate">
            {bet.prediction} · Cote {bet.odds} · Mise {bet.stake.toLocaleString('fr-FR')} FCFA
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {res ? (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${res.bg} ${res.text}`}>
              {res.label}
            </span>
          ) : (
            <span className="text-[11px] text-gray-600 flex items-center gap-1">
              <Clock size={11} /> Attente
            </span>
          )}
          {expanded ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
        </div>
      </div>

      {expanded && (
        <div className="pt-2 border-t border-white/[0.05] space-y-3">
          {gain && (
            <p className="text-sm text-primary-400">
              Gain : <strong>{parseInt(gain).toLocaleString('fr-FR')} FCFA</strong>
            </p>
          )}
          {bet.notes && (
            <p className="text-xs text-gray-500 leading-relaxed">{bet.notes}</p>
          )}
          <p className="text-[11px] text-gray-600">
            {format(new Date(bet.matchDate), 'dd MMM yyyy HH:mm', { locale: fr })}
          </p>

          {/* Changer le résultat */}
          <div className="flex gap-2 flex-wrap">
            {['WIN', 'LOSS', 'VOID'].map((r) => (
              <button
                key={r}
                onClick={() => onResultChange(bet.id, r)}
                className={`text-[11px] font-semibold px-3 py-1 rounded-lg transition-colors ${
                  bet.result === r
                    ? `${RESULT_COLORS[r].bg} ${RESULT_COLORS[r].text} border border-current`
                    : 'text-gray-600 bg-surface-700/40 hover:text-gray-300'
                }`}
              >
                {RESULT_COLORS[r].label}
              </button>
            ))}
            <button
              onClick={() => onDelete(bet.id)}
              className="ml-auto text-[11px] text-red-500 hover:text-red-400 flex items-center gap-1"
            >
              <Trash2 size={12} /> Supprimer
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

  usePageMeta('Mon carnet de paris — fpronix', 'Suivez vos pronostics sportifs et analysez votre ROI.');

  const { data, isLoading } = useQuery({
    queryKey: ['bets', filter],
    queryFn: () =>
      api.get(`/bets${filter ? `?result=${filter}` : ''}`).then((r) => r.data),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/bets/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bets'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, result }) => api.patch(`/bets/${id}`, { result }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bets'] }),
  });

  const bets = data?.data || [];
  const stats = data?.stats || {};

  const handleDelete = async (id) => {
    await deleteMutation.mutateAsync(id);
    toast('Paris supprimé', 'info');
  };

  const handleResultChange = async (id, result) => {
    await updateMutation.mutateAsync({ id, result });
  };

  const FILTERS = [
    { value: '', label: 'Tous' },
    { value: 'WIN', label: 'Gagnés' },
    { value: 'LOSS', label: 'Perdus' },
    { value: 'VOID', label: 'Annulés' },
  ];

  return (
    <div className="max-w-xl mx-auto px-4 py-5 space-y-5 pb-28 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-gray-100">{t('bets.title')}</h1>
          <p className="text-xs text-gray-500 mt-0.5">Suis tes pronostics et calcule ton ROI</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-cta flex items-center gap-2 text-sm px-4"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? 'Fermer' : t('bets.add')}
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {showForm && (
        <div className="bento-card">
          <h2 className="font-semibold text-gray-100 text-sm mb-4">Nouveau pari</h2>
          <BetForm
            onClose={() => setShowForm(false)}
            onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['bets'] }); }}
          />
        </div>
      )}

      {/* Statistiques */}
      {stats.settled > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatChip label="Parié" value={`${(stats.totalStaked || 0).toLocaleString('fr-FR')} F`} />
          <StatChip label={t('bets.winRate')} value={`${Math.round(stats.winRate || 0)}%`} highlight="text-primary-400" />
          <StatChip
            label={t('bets.roi')}
            value={`${stats.roi >= 0 ? '+' : ''}${stats.roi?.toFixed(1)}%`}
            highlight={stats.roi >= 0 ? 'text-primary-400' : 'text-red-400'}
          />
        </div>
      )}

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
          <p className="text-gray-300 font-semibold">{t('bets.noEntries')}</p>
          <p className="text-gray-500 text-sm">{t('bets.noEntriesDesc')}</p>
          <button onClick={() => setShowForm(true)} className="btn-cta inline-flex gap-2 mt-2">
            <Plus size={15} /> Ajouter mon premier pari
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
