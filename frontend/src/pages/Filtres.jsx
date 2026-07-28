import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Filter, ChevronRight, Zap, SlidersHorizontal, RotateCcw } from 'lucide-react';
import api from '../services/api';
import { SkeletonMatchCard } from '../components/ui/SkeletonLoader';
import CompetitionLogo from '../components/ui/CompetitionLogo';
import { OddsChip, ValueBetBadge } from '../components/ui/OddsChip';
import { getOdd, isValueBet, getValueEdge } from '../utils/mockOdds';

const MARKET_KEYS = ['all', '1', 'X', '2', '1X', 'X2', 'over25', 'over15', 'btts'];
const CONF_KEYS = ['all', 'high', 'medium', 'low'];

const CONF_COLORS = {
  high:   'text-primary-400 bg-primary-500/10 border-primary-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  low:    'text-gray-300 bg-surface-700/50 border-white/[0.05]',
};

const DATE_PRESETS = [
  { value: 'today',    labelKey: 'today',     days: 0  },
  { value: 'tomorrow', labelKey: 'tomorrow',  days: 1  },
  { value: '3days',    labelKey: 'threeDays', days: 3  },
  { value: 'week',     labelKey: 'week',      days: 7  },
  { value: '2weeks',   labelKey: 'twoWeeks',  days: 14 },
  { value: 'month',    labelKey: 'month',     days: 30 },
];

const STAT_EVENT_KEYS = ['over15', 'over25', 'over35', 'under15', 'under25', 'under35', 'btts_yes', 'btts_no'];

const FOTMOB_CDN = (id) => id ? `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png` : null;

function MiniLogo({ logo, teamId, name }) {
  const [err, setErr] = useState(false);
  const src = logo || FOTMOB_CDN(teamId);
  if (src && !err) return <img src={src} alt="" aria-hidden="true" className="w-5 h-5 object-contain shrink-0" onError={() => setErr(true)} />;
  return <div className="w-5 h-5 rounded-full bg-surface-600 flex items-center justify-center text-[8px] font-bold text-gray-300">{name?.[0]}</div>;
}

function FilterChips({ tKey, keys, value, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2 flex-wrap">
      {keys.map((k) => {
        const realValue = k === 'all' ? '' : k;
        return (
          <button key={k} onClick={() => onChange(realValue === value ? '' : realValue)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              value === realValue
                ? 'bg-select-500/15 text-select-400 border-select-500/30'
                : 'text-gray-300 border-white/[0.06] hover:text-gray-200'
            }`}>
            {t(`${tKey}.${k}`)}
          </button>
        );
      })}
    </div>
  );
}

// Slider avec valeur "désactivée" explicite (0 pour les seuils min, max pour les seuils max)
function RangeField({ label, value, onChange, min, max, step, unit, offValue, offLabel }) {
  const isOff = value === offValue;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className={`shrink-0 ${isOff ? 'text-gray-400' : 'text-primary-400'}`}>
          {isOff ? offLabel : `${value}${unit}`}
        </span>
      </p>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary-500 h-1.5 cursor-pointer" />
    </div>
  );
}

export default function Filtres() {
  const { t } = useTranslation();

  // ── Filtres statistiques avancés (façon BetMines) ────────────────────────────
  const [datePreset, setDatePreset]         = useState('week');
  const [leagueIds, setLeagueIds]           = useState([]);
  const [statEvent, setStatEvent]           = useState('over25');
  const [homeLast10Min, setHomeLast10Min]   = useState(0);
  const [awayLast10Min, setAwayLast10Min]   = useState(0);
  const [homeLeagueMin, setHomeLeagueMin]   = useState(0);
  const [awayLeagueMin, setAwayLeagueMin]   = useState(0);
  const [h2hMin, setH2hMin]                 = useState(0);
  const [avgScoredMin, setAvgScoredMin]     = useState(0);
  const [avgConcededMax, setAvgConcededMax] = useState(5);

  // ── Affinage sur les pronostics IA (existant) ────────────────────────────────
  const [market, setMarket]       = useState('');
  const [conf, setConf]           = useState('');
  const [minProb, setMinProb]     = useState(0);
  const [valueOnly, setValueOnly] = useState(false);

  function getDateRange(opt) {
    const base   = new Date();
    const preset = DATE_PRESETS.find((p) => p.value === opt) || DATE_PRESETS[0];
    const from   = format(base, 'yyyy-MM-dd');
    if (opt === 'today')    return { dateFrom: from, dateTo: from };
    if (opt === 'tomorrow') { const d = format(addDays(base, 1), 'yyyy-MM-dd'); return { dateFrom: d, dateTo: d }; }
    return { dateFrom: from, dateTo: format(addDays(base, preset.days - 1), 'yyyy-MM-dd') };
  }
  const { dateFrom, dateTo } = getDateRange(datePreset);
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: competitionsData } = useQuery({
    queryKey: ['filtres-competitions'],
    queryFn: () => api.get('/matches/competitions').then((r) => r.data),
    staleTime: Infinity,
  });
  const competitions = competitionsData?.data || [];

  function toggleLeague(id) {
    setLeagueIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  const advancedParams = useMemo(() => {
    const p = new URLSearchParams({
      dateFrom, dateTo, event: statEvent, limit: '100',
      homeLast10Min: String(homeLast10Min),
      awayLast10Min: String(awayLast10Min),
      homeLeagueMin: String(homeLeagueMin),
      awayLeagueMin: String(awayLeagueMin),
      h2hMin: String(h2hMin),
      avgScoredMin: String(avgScoredMin),
    });
    if (leagueIds.length) p.set('competitionIds', leagueIds.join(','));
    if (avgConcededMax < 5) p.set('avgConcededMax', String(avgConcededMax));
    return p.toString();
  }, [dateFrom, dateTo, statEvent, homeLast10Min, awayLast10Min, homeLeagueMin, awayLeagueMin, h2hMin, avgScoredMin, avgConcededMax, leagueIds]);

  const { data: filterData, isLoading } = useQuery({
    queryKey: ['filtres-advanced', advancedParams],
    queryFn: () => api.get(`/matches/advanced-filter?${advancedParams}`).then((r) => r.data),
  });

  const allMatches = filterData?.data || [];

  const aiFilterActive = !!(market || conf || minProb > 0 || valueOnly);

  const filtered = useMemo(() => allMatches.filter((m) => {
    const p = m.predictions;
    if (!aiFilterActive) return true;
    if (!p) return false;
    if (market && p.bestPick.type !== market) return false;
    if (conf && p.confidence !== conf) return false;
    if (p.bestPick.prob < minProb) return false;
    if (valueOnly) {
      const odd = getOdd(p.bestPick.prob, `${m.id}-${p.bestPick.type}`);
      if (!isValueBet(p.bestPick.prob, odd)) return false;
    }
    return true;
  }), [allMatches, market, conf, minProb, valueOnly, aiFilterActive]);

  function resetAll() {
    setDatePreset('week'); setLeagueIds([]); setStatEvent('over25');
    setHomeLast10Min(0); setAwayLast10Min(0); setHomeLeagueMin(0); setAwayLeagueMin(0);
    setH2hMin(0); setAvgScoredMin(0); setAvgConcededMax(5);
    setMarket(''); setConf(''); setMinProb(0); setValueOnly(false);
  }

  return (
    <div className="max-w-2xl mx-auto py-5 space-y-5">

      {/* En-tête */}
      <div className="px-4">
        <div className="flex items-center gap-2 mb-1">
          <Filter size={18} className="text-primary-400" />
          <h1 className="section-title">{t('filtersPage.title')}</h1>
        </div>
        <p className="text-xs text-gray-300">{t('filtersPage.subtitle')}</p>
      </div>

      {/* ── Filtres statistiques avancés ───────────────────────────────────────── */}
      <div className="px-4 card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-primary-400" />
            <p className="text-sm font-bold text-gray-200">{t('filtersPage.advancedSectionTitle')}</p>
          </div>
          <button onClick={resetAll} className="flex items-center gap-1 text-[11px] text-gray-300 hover:text-gray-200 transition-colors">
            <RotateCcw size={12} /> {t('filtersPage.reset')}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 -mt-2">{t('filtersPage.advancedHint')}</p>

        {/* Plage de dates */}
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">{t('filtersPage.dateRangeLabel')}</p>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              {DATE_PRESETS.map((o) => (
                <button key={o.value} onClick={() => setDatePreset(o.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                    datePreset === o.value
                      ? 'bg-select-500/15 text-select-400 border-select-500/30'
                      : 'text-gray-300 border-white/[0.06] hover:text-gray-200'
                  }`}>
                  {t(`machine.datePresets.${o.labelKey}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ligues */}
        {competitions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">{t('filtersPage.leaguesLabel')}</p>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 min-w-max">
                <button onClick={() => setLeagueIds([])}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                    leagueIds.length === 0
                      ? 'bg-select-500/15 text-select-400 border-select-500/30'
                      : 'text-gray-300 border-white/[0.06] hover:text-gray-200'
                  }`}>
                  {t('filtersPage.allLeaguesChip')}
                </button>
                {competitions.map((c) => (
                  <button key={c.id} onClick={() => toggleLeague(c.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                      leagueIds.includes(c.id)
                        ? 'bg-select-500/15 text-select-400 border-select-500/30'
                        : 'text-gray-300 border-white/[0.06] hover:text-gray-200'
                    }`}>
                    <CompetitionLogo logo={c.logo} size={14} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Événement statistique */}
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">{t('filtersPage.statEventLabel')}</p>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              {STAT_EVENT_KEYS.map((k) => (
                <button key={k} onClick={() => setStatEvent(k)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                    statEvent === k
                      ? 'bg-select-500/15 text-select-400 border-select-500/30'
                      : 'text-gray-300 border-white/[0.06] hover:text-gray-200'
                  }`}>
                  {t(`filtersPage.statEventOptions.${k}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Seuils */}
        <div className="space-y-3 pt-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('filtersPage.thresholdsLabel')}</p>

          <RangeField label={t('filtersPage.homeLast10Label')} value={homeLast10Min} onChange={setHomeLast10Min}
            min={0} max={100} step={5} unit="%" offValue={0} offLabel={t('filtersPage.anyLevel')} />
          <RangeField label={t('filtersPage.awayLast10Label')} value={awayLast10Min} onChange={setAwayLast10Min}
            min={0} max={100} step={5} unit="%" offValue={0} offLabel={t('filtersPage.anyLevel')} />
          <RangeField label={t('filtersPage.homeLeagueLabel')} value={homeLeagueMin} onChange={setHomeLeagueMin}
            min={0} max={100} step={5} unit="%" offValue={0} offLabel={t('filtersPage.anyLevel')} />
          <RangeField label={t('filtersPage.awayLeagueLabel')} value={awayLeagueMin} onChange={setAwayLeagueMin}
            min={0} max={100} step={5} unit="%" offValue={0} offLabel={t('filtersPage.anyLevel')} />
          <RangeField label={t('filtersPage.h2hLabel')} value={h2hMin} onChange={setH2hMin}
            min={0} max={100} step={5} unit="%" offValue={0} offLabel={t('filtersPage.anyLevel')} />
          <RangeField label={t('filtersPage.avgScoredLabel')} value={avgScoredMin} onChange={setAvgScoredMin}
            min={0} max={5} step={0.5} unit=" buts" offValue={0} offLabel={t('filtersPage.anyLevel')} />
          <RangeField label={t('filtersPage.avgConcededLabel')} value={avgConcededMax} onChange={setAvgConcededMax}
            min={0} max={5} step={0.5} unit=" buts" offValue={5} offLabel={t('filtersPage.noLimit')} />
        </div>
      </div>

      {/* ── Affiner sur les pronostics IA ──────────────────────────────────────── */}
      <div className="px-4 card p-4 space-y-4">
        <p className="text-sm font-bold text-gray-200">{t('filtersPage.aiSectionTitle')}</p>

        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">{t('filtersPage.marketLabel')}</p>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              {MARKET_KEYS.map((k) => {
                const realValue = k === 'all' ? '' : k;
                return (
                  <button key={k} onClick={() => setMarket(realValue === market ? '' : realValue)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                      market === realValue
                        ? 'bg-select-500/15 text-select-400 border-select-500/30'
                        : 'text-gray-300 border-white/[0.06] hover:text-gray-200'
                    }`}>
                    {t(`filtersPage.marketOptions.${k}`)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">{t('filtersPage.confidenceLabel')}</p>
          <FilterChips tKey="filtersPage.confOptions" keys={CONF_KEYS} value={conf} onChange={setConf} />
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
            {t('filtersPage.minProbLabel')} <span className="text-primary-400">{minProb > 0 ? `${minProb}%` : t('filtersPage.anyLevel')}</span>
          </p>
          <input type="range" min="0" max="90" step="5" value={minProb}
            onChange={(e) => setMinProb(Number(e.target.value))}
            className="w-full accent-primary-500 h-1.5 cursor-pointer" />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0%</span><span>90%</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setValueOnly((v) => !v)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
            valueOnly
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              : 'text-gray-300 border-white/[0.06] hover:text-gray-200'
          }`}
        >
          <span className="flex items-center gap-2">
            <Zap size={14} className={valueOnly ? 'text-amber-400' : 'text-gray-400'} />
            {t('filtersPage.valueOnly')}
          </span>
          <span className={`w-9 h-5 rounded-full relative transition-colors ${valueOnly ? 'bg-amber-500' : 'bg-surface-600'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${valueOnly ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
          </span>
        </button>
      </div>

      {/* Résultats */}
      <div className="px-4">
        <p className="text-xs text-gray-300 mb-3">
          {isLoading ? t('filtersPage.loading') : t('filtersPage.matchesFound', { count: filtered.length })}
        </p>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonMatchCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-p text-center py-10">
            <p className="text-2xl mb-2">🔍</p>
            <p className="text-gray-300 text-sm">{t('filtersPage.noMatchesFound')}</p>
            <button onClick={resetAll} className="btn-secondary mt-3 text-sm">
              {t('filtersPage.resetFilters')}
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden divide-y divide-white/[0.04]">
            {filtered.map((m) => {
              const pred   = m.predictions;
              const isToday = format(new Date(m.scheduledAt), 'yyyy-MM-dd') === today;
              const odd    = pred ? getOdd(pred.bestPick.prob, `${m.id}-${pred.bestPick.type}`) : null;
              const edge   = pred ? getValueEdge(pred.bestPick.prob, odd) : null;
              const value  = pred ? isValueBet(pred.bestPick.prob, odd) : false;
              const ts     = m.teamStats;
              return (
                <Link key={m.id} to={`/matchs/${m.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                  <div className="w-10 shrink-0 text-center">
                    <span className="text-xs text-gray-400 block">
                      {isToday ? t('filtersPage.today') : format(new Date(m.scheduledAt), 'dd/MM')}
                    </span>
                    <span className="text-xs font-semibold text-gray-400 tabular-nums">
                      {format(new Date(m.scheduledAt), 'HH:mm')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <MiniLogo logo={m.homeTeamLogo} teamId={m.homeTeamId} name={m.homeTeam} />
                      <span className="text-sm font-medium text-gray-200 truncate">{m.homeTeam}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MiniLogo logo={m.awayTeamLogo} teamId={m.awayTeamId} name={m.awayTeam} />
                      <span className="text-sm font-medium text-gray-400 truncate">{m.awayTeam}</span>
                    </div>
                    {ts && (
                      <div className="flex items-center gap-1.5 flex-wrap text-[9px] font-semibold">
                        <span className="px-1.5 py-0.5 rounded bg-surface-700/60 text-gray-400">
                          {t('filtersPage.statsRow.home')} {ts.home.last10.pct != null ? `${ts.home.last10.pct}%` : '—'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-surface-700/60 text-gray-400">
                          {t('filtersPage.statsRow.away')} {ts.away.last10.pct != null ? `${ts.away.last10.pct}%` : '—'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-surface-700/60 text-gray-400">
                          {t('filtersPage.statsRow.h2h')} {ts.h2h.pct != null ? `${ts.h2h.pct}%` : '—'}
                        </span>
                      </div>
                    )}
                  </div>
                  {pred ? (
                    <>
                      <div className={`shrink-0 text-center px-3 py-1.5 rounded-lg border ${CONF_COLORS[pred.confidence]}`}>
                        <span className="block text-sm font-bold">{pred.bestPick.prob}%</span>
                        <span className="block text-[10px] font-semibold">{t(`filtersPage.pickLabels.${pred.bestPick.type}`, { defaultValue: pred.bestPick.type })}</span>
                      </div>
                      <div className="shrink-0 flex flex-col items-center gap-1">
                        <OddsChip odd={odd} />
                        {value && <ValueBetBadge edge={edge} />}
                      </div>
                    </>
                  ) : (
                    <span className="shrink-0 text-xs text-gray-400">—</span>
                  )}
                  <ChevronRight size={14} className="text-gray-400 shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
