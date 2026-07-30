import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Flag, Crown, Users, Loader2, Heart, HeartOff, MessageCircle, Send, ChevronDown, ChevronUp, TrendingUp, Save, Power } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { TipsterBadge, ResultBadge } from '../components/ui/Badge';
import SuccessRateBar from '../components/ui/SuccessRateBar';
import Avatar from '../components/ui/Avatar';
import TeamLogo from '../components/ui/TeamLogo';
import { SkeletonCard, SkeletonText } from '../components/ui/SkeletonLoader';
import InfoTooltip from '../components/ui/InfoTooltip';
import { estimateTipsterROI } from '../utils/mockOdds';
import { useAnalytics } from '../hooks/useAnalytics';
import { useCurrency } from '../hooks/useCurrency';

// ─── Mini SVG ROI Line Chart ───────────────────────────────────────────────────
function ROIChart({ data }) {
  const { t } = useTranslation();
  if (!data || data.length < 2) return null;

  const W = 280, H = 80, PAD = 12;
  const rois = data.map((d) => d.roi);
  const min = Math.min(...rois, -5);
  const max = Math.max(...rois, 5);
  const range = max - min || 1;

  const toX = (i) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const toY = (v) => H - PAD - ((v - min) / range) * (H - PAD * 2);

  const points = data.map((d, i) => `${toX(i)},${toY(d.roi)}`).join(' ');
  const zeroY = toY(0);
  const lastRoi = rois[rois.length - 1];
  const color = lastRoi >= 0 ? '#22c55e' : '#ef4444';

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <TrendingUp size={13} className="text-ink-3" />
        <p className="text-xs text-ink-3">{t('tipsterProfile.weeklyRoi')}</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
        {/* Zéro line */}
        {zeroY > PAD && zeroY < H - PAD && (
          <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke="#374151" strokeDasharray="3,3" />
        )}
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dots */}
        {data.map((d, i) => (
          <circle key={i} cx={toX(i)} cy={toY(d.roi)} r="3" fill={d.roi >= 0 ? '#22c55e' : '#ef4444'} />
        ))}
        {/* Last value label */}
        <text
          x={toX(data.length - 1)}
          y={toY(lastRoi) - 6}
          textAnchor="middle"
          fontSize="9"
          fill={color}
          fontWeight="600"
        >
          {lastRoi >= 0 ? '+' : ''}{lastRoi.toFixed(1)}%
        </text>
      </svg>
    </div>
  );
}

// ─── Comments section pour un tip ─────────────────────────────────────────────
function TipComments({ tipId }) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['comments', tipId],
    queryFn: () => api.get(`/comments/${tipId}`).then((r) => r.data),
  });

  const addMutation = useMutation({
    mutationFn: () => api.post(`/comments/${tipId}`, { content: text }),
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: ['comments', tipId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId) => api.delete(`/comments/${commentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', tipId] }),
  });

  const comments = data?.data || [];

  return (
    <div className="pt-3 border-t border-surface-700 space-y-3">
      {isLoading && <p className="text-xs text-ink-3">{t('tipsterProfile.loadingComments')}</p>}
      {comments.map((c) => (
        <div key={c.id} className="flex gap-2 text-xs">
          <div className="h-6 w-6 rounded-full bg-surface-600 flex items-center justify-center text-ink-3 font-semibold shrink-0 text-[10px]">
            {(c.user?.profile?.displayName || c.user?.username || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <span className="font-medium text-ink-3">
              {c.user?.profile?.displayName || c.user?.username}
            </span>
            <span className="text-ink-3 ml-1">{format(new Date(c.createdAt), 'dd MMM HH:mm', { locale: dateLocale })}</span>
            <p className="text-ink-4 mt-0.5">{c.content}</p>
          </div>
          {(user?.id === c.userId || user?.role === 'ADMIN') && (
            <button
              onClick={() => deleteMutation.mutate(c.id)}
              className="text-ink-4 hover:text-red-400 transition-colors self-start mt-0.5"
            >
              ×
            </button>
          )}
        </div>
      ))}
      {!comments.length && !isLoading && (
        <p className="text-xs text-ink-4">{t('tipsterProfile.noComments')}</p>
      )}
      {user && (
        <div className="flex gap-2 items-center">
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && text.trim() && addMutation.mutate()}
            placeholder={t('tipsterProfile.commentPlaceholder')}
            className="flex-1 bg-surface-700 border border-surface-600 rounded-lg px-2.5 py-1.5 text-xs text-ink-2 placeholder-ph-b focus:outline-none focus:border-primary-500"
          />
          <button
            onClick={() => text.trim() && addMutation.mutate()}
            disabled={!text.trim() || addMutation.isPending}
            className="p-1.5 rounded-lg bg-primary-500 text-white disabled:opacity-40 hover:bg-primary-400 transition-colors"
          >
            {addMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tip card with expandable comments ────────────────────────────────────────
function TipCard({ tip }) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  const [showComments, setShowComments] = useState(false);
  const match = tip.match;
  return (
    <div className="bento-card space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link to={`/matchs/${tip.matchId}`} className="flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-primary-300 truncate">
            <TeamLogo logo={match?.homeTeamLogo} teamId={match?.homeTeamId} name={match?.homeTeam} size={16} />
            <span className="truncate">{match?.homeTeam}</span>
            <span className="text-ink-4 shrink-0">vs</span>
            <TeamLogo logo={match?.awayTeamLogo} teamId={match?.awayTeamId} name={match?.awayTeam} size={16} />
            <span className="truncate">{match?.awayTeam}</span>
          </Link>
          <p className="text-xs text-ink-3 mt-1 flex items-center gap-1.5 flex-wrap">
            {match?.competition?.name && (
              <span className="inline-flex items-center gap-1">
                {match.competition.logo && (
                  <img src={match.competition.logo} alt="" className="w-3 h-3 object-contain shrink-0" />
                )}
                {match.competition.name}
              </span>
            )}
            <span>
              {t(`tipsterProfile.predLabels.${tip.prediction}`, { defaultValue: tip.prediction })}
              {' '}· {format(new Date(tip.createdAt), 'dd MMM', { locale: dateLocale })}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ResultBadge result={tip.result} />
          <button
            onClick={() => setShowComments((v) => !v)}
            className="flex items-center gap-1 text-xs text-ink-3 hover:text-primary-400 transition-colors"
            title={t('tipsterProfile.comments')}
          >
            <MessageCircle size={13} />
            {showComments ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>
      </div>
      {showComments && <TipComments tipId={tip.id} />}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function TipsterProfile() {
  const { t } = useTranslation();
  const { userId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { track } = useAnalytics();
  const { formatConverted } = useCurrency();

  // Track profile view
  useState(() => { track('tipster_view', userId); }, [userId]);

  const { data, isLoading } = useQuery({
    queryKey: ['tipster', userId],
    queryFn: () => api.get(`/tips/tipster/${userId}`).then((r) => r.data),
  });

  // Plan du tipster
  const { data: planData } = useQuery({
    queryKey: ['tipster-plan', userId],
    queryFn: () => api.get(`/tipster-plans/${userId}`).then((r) => r.data).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  // Statut d'abonnement
  const { data: subStatus, refetch: refetchSub } = useQuery({
    queryKey: ['tipster-sub-status', userId],
    queryFn: () => api.get(`/tipster-plans/mine/status?tipsterId=${userId}`).then((r) => r.data),
    enabled: !!user && user?.id !== userId,
    staleTime: 60 * 1000,
  });

  // Statut de follow
  const { data: followStatus, refetch: refetchFollow } = useQuery({
    queryKey: ['follow-status', userId],
    queryFn: () => api.get(`/follows/${userId}/status`).then((r) => r.data).catch(() => ({ following: false })),
    staleTime: 30 * 1000,
  });

  // Nombre de followers
  const { data: followerData, refetch: refetchFollowerCount } = useQuery({
    queryKey: ['follower-count', userId],
    queryFn: () => api.get(`/follows/${userId}/count`).then((r) => r.data),
    staleTime: 60 * 1000,
  });

  // Historique ROI hebdomadaire
  const { data: weeklyData } = useQuery({
    queryKey: ['weekly-stats', userId],
    queryFn: () => api.get(`/tips/tipster/${userId}/weekly-stats`).then((r) => r.data).catch(() => null),
    staleTime: 10 * 60 * 1000,
  });

  const subscribeMutation = useMutation({
    mutationFn: () => api.post('/payments/tipster/paydunya/init', { tipsterId: userId }),
    onSuccess: ({ data }) => {
      if (data?.data?.checkoutUrl) window.location.href = data.data.checkoutUrl;
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: () => api.delete(`/tipster-plans/${userId}/subscribe`),
    onSuccess: () => refetchSub(),
  });

  // ── Gestion du plan (propriétaire uniquement) ──────────────────────────────
  const isOwnProfile = user?.id === userId;
  const [planForm, setPlanForm] = useState(null); // { name, description, price, isActive }
  const [planFormInit, setPlanFormInit] = useState(false);

  const upsertPlanMutation = useMutation({
    mutationFn: (data) => api.post('/tipster-plans', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tipster-plan', userId] }),
  });

  const { data: subscribersData } = useQuery({
    queryKey: ['tipster-subscribers', userId],
    queryFn: () => api.get('/tipster-plans/mine/subscribers').then((r) => r.data),
    enabled: isOwnProfile && !!user,
    staleTime: 60 * 1000,
  });

  const followMutation = useMutation({
    mutationFn: () => api.post(`/follows/${userId}`),
    onSuccess: () => {
      refetchFollow();
      refetchFollowerCount();
      queryClient.invalidateQueries({ queryKey: ['follower-count', userId] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => api.delete(`/follows/${userId}`),
    onSuccess: () => {
      refetchFollow();
      refetchFollowerCount();
    },
  });

  const plan = planData?.data;
  const isSubscribed = subStatus?.subscribed;
  const isFollowing = followStatus?.following;
  const followerCount = followerData?.count ?? 0;

  // Initialise le formulaire de plan une fois les données chargées (propriétaire)
  useEffect(() => {
    if (!isOwnProfile || planFormInit) return;
    if (planData !== undefined) {
      setPlanForm({
        name: plan?.name || 'Plan Premium',
        description: plan?.description || '',
        price: plan?.price || 1000,
        isActive: plan?.isActive ?? true,
      });
      setPlanFormInit(true);
    }
  }, [isOwnProfile, planData, planFormInit, plan]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <SkeletonCard className="h-32" />
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    );
  }

  const { user: tipster, stats, recentTips, weeklyStats: inlineWeekly } = data?.data || {};
  if (!tipster) return <div className="text-center py-20 text-ink-3">{t('tipsterProfile.notFound')}</div>;

  const displayName = tipster.profile?.displayName || tipster.username;
  const isOwn = isOwnProfile;
  const roi = stats?.totalTips > 0 ? estimateTipsterROI(stats.successRate, userId) : null;
  const weeklyChartData = weeklyData?.data || inlineWeekly || [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">

      {/* ── Profil header ── */}
      <section className="bento-card">
        <div className="flex items-start gap-4">
          <Avatar user={tipster} name={displayName} size={64} className="text-2xl" />
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-xl text-ink-1">{displayName}</h1>
            <p className="text-ink-3 text-sm">@{tipster.username}</p>
            {tipster.profile?.bio && (
              <p className="text-ink-4 text-sm mt-2">{tipster.profile.bio}</p>
            )}
            <div className="flex flex-wrap gap-1 mt-2">
              {(stats?.badges || []).map((b) => <TipsterBadge key={b} badgeCode={b} />)}
            </div>
            {/* Follower count */}
            <p className="text-xs text-ink-3 mt-2 flex items-center gap-1">
              <Users size={11} />
              {t('tipsterProfile.followersCount', { count: followerCount })}
            </p>
          </div>

          {/* Follow + Favorite buttons */}
          {!isOwn && (
            <div className="flex flex-col gap-2 shrink-0">
              {user ? (
                <button
                  onClick={() => isFollowing ? unfollowMutation.mutate() : followMutation.mutate()}
                  disabled={followMutation.isPending || unfollowMutation.isPending}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${
                    isFollowing
                      ? 'bg-surface-600 text-ink-3 hover:bg-red-500/20 hover:text-red-400'
                      : 'bg-primary-500/15 text-primary-400 hover:bg-primary-500/30'
                  }`}
                  aria-label={isFollowing ? t('tipsterProfile.unfollow') : t('tipsterProfile.follow')}
                >
                  {(followMutation.isPending || unfollowMutation.isPending) ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : isFollowing ? (
                    <HeartOff size={12} />
                  ) : (
                    <Heart size={12} />
                  )}
                  {isFollowing ? t('tipsterProfile.following') : t('tipsterProfile.follow')}
                </button>
              ) : (
                <Link
                  to="/connexion"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-500/15 text-primary-400 hover:bg-primary-500/30"
                >
                  <Heart size={12} /> {t('tipsterProfile.loginToFollow')}
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Stats bento grid ── */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bento-card text-center">
            <p className="text-3xl font-display font-bold text-ink-1">{stats.totalTips}</p>
            <p className="text-xs text-ink-3 mt-1">{t('tipsterProfile.picksCount')}</p>
          </div>
          <div className="bento-card">
            <SuccessRateBar rate={stats.successRate} total={stats.totalTips} size="lg" />
            <p className="text-xs text-ink-3 mt-1">{t('tipsterProfile.globalSuccessRate')}</p>
          </div>
          <div className="bento-card text-center">
            <p className="text-2xl font-display font-bold text-ink-1">
              {stats.globalRank ? `#${stats.globalRank}` : '–'}
            </p>
            <p className="text-xs text-ink-3 mt-1">{t('tipsterProfile.globalRank')}</p>
          </div>
          <div className="bento-card text-center">
            <p className="text-2xl font-display font-bold text-ink-1">
              {stats.monthlyRank ? `#${stats.monthlyRank}` : '–'}
            </p>
            <p className="text-xs text-ink-3 mt-1">{t('tipsterProfile.monthlyRank')}</p>
          </div>
          {roi != null && (
            <div className="bento-card text-center col-span-2">
              <p className={`text-2xl font-display font-bold ${roi >= 0 ? 'text-primary-400' : 'text-red-400'}`}>
                {roi >= 0 ? '+' : ''}{roi}%
              </p>
              <p className="text-xs text-ink-3 mt-1 flex items-center justify-center gap-1">
                {t('tipsterProfile.estimatedRoi')}
                <InfoTooltip text={t('tipsterProfile.estimatedRoiTooltip')} size={10} />
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── ROI hebdomadaire chart ── */}
      {weeklyChartData.length >= 2 && (
        <div className="bento-card">
          <ROIChart data={weeklyChartData} />
        </div>
      )}

      {/* ── Plan d'abonnement tipster ── */}
      {plan && !isOwn && (
        <div className="bento-card border-primary-500/30 bg-primary-500/5 space-y-3">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-primary-400" />
            <p className="font-semibold text-ink-1">{plan.name}</p>
            <div className="ml-auto text-right">
              <span className="text-lg font-display font-bold text-primary-400">
                {plan.price.toLocaleString('fr-FR')} FCFA
                <span className="text-xs text-ink-3 font-normal"> {t('tipsterProfile.perMonth')}</span>
              </span>
              {formatConverted(plan.price) && (
                <p className="text-xs text-ink-4">≈ {formatConverted(plan.price)}</p>
              )}
            </div>
          </div>
          {plan.description && (
            <p className="text-xs text-ink-4">{plan.description}</p>
          )}
          {plan.subscriberCount > 0 && (
            <p className="text-xs text-ink-3 flex items-center gap-1">
              <Users size={11} />
              {t('tipsterProfile.subscribersCount', { count: plan.subscriberCount })}
            </p>
          )}
          {user ? (
            isSubscribed ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-400 font-medium">{t('tipsterProfile.subscribed')}</span>
                <button
                  onClick={() => unsubscribeMutation.mutate()}
                  disabled={unsubscribeMutation.isPending}
                  className="text-xs text-ink-3 hover:text-red-400 transition-colors"
                >
                  {unsubscribeMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : t('tipsterProfile.unsubscribe')}
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => subscribeMutation.mutate()}
                  disabled={subscribeMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-400 transition-colors disabled:opacity-40"
                >
                  {subscribeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Crown size={14} />}
                  {subscribeMutation.isPending
                    ? t('tipsterProfile.redirectingPayment')
                    : t('tipsterProfile.subscribe', { price: plan.price.toLocaleString('fr-FR') })}
                </button>
                {subscribeMutation.isError && (
                  <p className="text-xs text-red-400 text-center">
                    {subscribeMutation.error?.response?.data?.message || t('tipsterProfile.subscribeError')}
                  </p>
                )}
              </>
            )
          ) : (
            <Link
              to="/connexion"
              className="block text-center py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-400 transition-colors"
            >
              {t('tipsterProfile.loginToSubscribe')}
            </Link>
          )}
        </div>
      )}

      {/* ── Gestion du plan tipster (propriétaire uniquement) ── */}
      {isOwn && stats && planForm && (
        <div className="bento-card space-y-4">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-primary-400" />
            <p className="font-semibold text-ink-1">{t('tipsterProfile.managePlanTitle')}</p>
          </div>
          <p className="text-xs text-ink-3">{t('tipsterProfile.managePlanDesc')}</p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-ink-3 mb-1 block">{t('tipsterProfile.planNameLabel')}</label>
              <input
                type="text"
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                maxLength={100}
                className="w-full px-3 py-2 rounded-lg bg-surface-700 border border-overlay/[0.08] text-sm text-ink-1 focus:outline-none focus:border-primary-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-ink-3 mb-1 block">{t('tipsterProfile.planDescLabel')}</label>
              <textarea
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                maxLength={500}
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-surface-700 border border-overlay/[0.08] text-sm text-ink-1 focus:outline-none focus:border-primary-500/50 resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-ink-3 mb-1 block">{t('tipsterProfile.planPriceLabel')}</label>
              <input
                type="number"
                min={100}
                max={100000}
                step={100}
                value={planForm.price}
                onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-surface-700 border border-overlay/[0.08] text-sm text-ink-1 focus:outline-none focus:border-primary-500/50"
              />
            </div>
            <button
              onClick={() => setPlanForm({ ...planForm, isActive: !planForm.isActive })}
              className="flex items-center gap-2 text-xs"
            >
              <Power size={13} className={planForm.isActive ? 'text-primary-400' : 'text-ink-4'} />
              <span className={planForm.isActive ? 'text-primary-400' : 'text-ink-3'}>
                {planForm.isActive ? t('tipsterProfile.planActiveLabel') : t('tipsterProfile.planInactiveLabel')}
              </span>
            </button>
          </div>

          <button
            onClick={() => upsertPlanMutation.mutate(planForm)}
            disabled={upsertPlanMutation.isPending || !planForm.name || planForm.price < 100}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-400 transition-colors disabled:opacity-40"
          >
            {upsertPlanMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t('tipsterProfile.savePlan')}
          </button>
          {upsertPlanMutation.isSuccess && (
            <p className="text-xs text-primary-400 text-center">{t('tipsterProfile.planSaved')}</p>
          )}
          {upsertPlanMutation.isError && (
            <p className="text-xs text-red-400 text-center">
              {upsertPlanMutation.error?.response?.data?.message || t('tipsterProfile.planSaveError')}
            </p>
          )}

          {/* Liste des abonnés */}
          {plan && (
            <div className="pt-2 border-t border-overlay/[0.06]">
              <p className="text-xs font-semibold text-ink-3 mb-2 flex items-center gap-1.5">
                <Users size={12} />
                {t('tipsterProfile.mySubscribers', { count: subscribersData?.total ?? 0 })}
              </p>
              {subscribersData?.data?.length ? (
                <div className="space-y-1.5">
                  {subscribersData.data.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2 text-xs text-ink-4">
                      <Avatar user={sub.subscriber} name={sub.subscriber?.profile?.displayName || sub.subscriber?.username} size={22} />
                      <span className="truncate">{sub.subscriber?.profile?.displayName || sub.subscriber?.username}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-4">{t('tipsterProfile.noSubscribers')}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Pronostics récents avec commentaires ── */}
      <section>
        <h2 className="font-semibold text-ink-1 mb-3">{t('tipsterProfile.recentPicks')}</h2>
        <div className="space-y-2">
          {recentTips?.map((tip) => <TipCard key={tip.id} tip={tip} />)}
          {!recentTips?.length && (
            <p className="text-ink-3 text-sm text-center py-4">{t('tipsterProfile.noRecentPicks')}</p>
          )}
        </div>
      </section>

      {/* ── Signalement ── */}
      {!isOwn && user && recentTips?.length > 0 && (
        <p className="text-center">
          <button
            onClick={() => {/* modal signalement */}}
            className="text-xs text-ink-4 hover:text-ink-3 flex items-center gap-1 mx-auto"
          >
            <Flag size={12} aria-hidden="true" />
            {t('tipsterProfile.reportTipster')}
          </button>
        </p>
      )}

      <p className="disclaimer text-center">
        {t('tipsterProfile.disclaimer')}
      </p>
    </div>
  );
}
