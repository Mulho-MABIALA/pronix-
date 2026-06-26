import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bot, FileText, Search, BarChart2, HeadphonesIcon, Play, RefreshCw, Check, X, ChevronDown, ChevronUp, Bell } from 'lucide-react';
import api from '../../services/api';

const AGENTS = [
  {
    id: 'contenu',
    label: 'Agent Contenu',
    description: 'Génère les posts WhatsApp & Facebook pour les matchs du jour',
    icon: FileText,
    color: 'bg-blue-500/20 text-blue-400',
    border: 'border-blue-500/25',
  },
  {
    id: 'seo',
    label: 'Agent SEO',
    description: 'Génère titre, meta description et introduction SEO pour un match',
    icon: Search,
    color: 'bg-purple-500/20 text-purple-400',
    border: 'border-purple-500/25',
  },
  {
    id: 'analyse',
    label: 'Agent Analyse',
    description: 'Classement hebdomadaire des tipsters + rapport communauté',
    icon: BarChart2,
    color: 'bg-green-500/20 text-green-400',
    border: 'border-green-500/25',
  },
  {
    id: 'support',
    label: 'Agent Support',
    description: 'Répond à une question sur la plateforme (test manuel)',
    icon: HeadphonesIcon,
    color: 'bg-orange-500/20 text-orange-400',
    border: 'border-orange-500/25',
    hasInput: true,
    inputLabel: 'Question',
    inputPlaceholder: 'Ex: Quelle est la différence entre FREE et Premium ?',
  },
];

function ResultBlock({ result }) {
  const [expanded, setExpanded] = useState(false);

  if (!result) return null;

  const preview = JSON.stringify(result, null, 2).slice(0, 300);
  const full = JSON.stringify(result, null, 2);
  const truncated = full.length > 300;

  // Affichage spécial pour le contenu social
  if (result.posts?.whatsapp) {
    return (
      <div className="mt-4 space-y-3">
        <div className="bg-surface-900 rounded-xl p-4 border border-surface-600">
          <p className="text-xs font-semibold text-green-400 mb-2 uppercase tracking-wider">WhatsApp</p>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{result.posts.whatsapp}</p>
        </div>
        <div className="bg-surface-900 rounded-xl p-4 border border-surface-600">
          <p className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wider">Facebook</p>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{result.posts.facebook}</p>
        </div>
        {result.posts.meilleurMatch && (
          <p className="text-xs text-gray-500">Match vedette : <span className="text-gray-300">{result.posts.meilleurMatch}</span></p>
        )}
      </div>
    );
  }

  // Affichage spécial support
  if (result.reponse) {
    return (
      <div className="mt-4 bg-surface-900 rounded-xl p-4 border border-surface-600">
        <p className="text-xs font-semibold text-orange-400 mb-2 uppercase tracking-wider">Réponse</p>
        <p className="text-sm text-gray-300 whitespace-pre-wrap">{result.reponse}</p>
      </div>
    );
  }

  // Affichage spécial SEO
  if (result.seo?.title) {
    const s = result.seo;
    return (
      <div className="mt-4 space-y-2">
        {[
          { label: 'Title', value: s.title },
          { label: 'Meta description', value: s.metaDescription },
          { label: 'H1', value: s.h1 },
          { label: 'Introduction', value: s.introduction },
        ].map(({ label, value }) => value && (
          <div key={label} className="bg-surface-900 rounded-xl p-3 border border-surface-600">
            <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-sm text-gray-300">{value}</p>
          </div>
        ))}
        {s.keywords?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {s.keywords.map((kw) => (
              <span key={kw} className="text-[10px] px-2 py-0.5 rounded bg-surface-700 text-gray-400">{kw}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Affichage spécial analyse tipsters
  if (result.rapport?.classement) {
    const r = result.rapport;
    return (
      <div className="mt-4 space-y-3">
        {r.tipsterSemaine && (
          <div className="bg-primary-500/10 border border-primary-500/25 rounded-xl p-3">
            <p className="text-xs font-semibold text-primary-400 mb-1">Tipster de la semaine</p>
            <p className="text-sm text-gray-200 font-medium">{r.tipsterSemaine.username}</p>
            <p className="text-xs text-gray-400 mt-0.5">{r.tipsterSemaine.raison}</p>
          </div>
        )}
        <div className="bg-surface-900 rounded-xl p-3 border border-surface-600 space-y-2">
          {r.classement?.map((t) => (
            <div key={t.rang} className="flex items-start gap-2">
              <span className="text-xs font-bold text-gray-500 w-4 shrink-0 mt-0.5">#{t.rang}</span>
              <div>
                <p className="text-sm font-medium text-gray-200">{t.username} <span className="text-primary-400 font-bold">{t.weeklyRate}%</span></p>
                <p className="text-xs text-gray-500">{t.commentaire}</p>
              </div>
            </div>
          ))}
        </div>
        {r.tendances && (
          <div className="bg-surface-900 rounded-xl p-3 border border-surface-600">
            <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Tendances</p>
            <p className="text-sm text-gray-300">{r.tendances}</p>
          </div>
        )}
        {r.messageComm && (
          <p className="text-xs text-gray-500 italic">{r.messageComm}</p>
        )}
      </div>
    );
  }

  // Fallback JSON
  return (
    <div className="mt-4">
      <pre className="text-xs text-gray-400 bg-surface-900 rounded-xl p-3 border border-surface-600 overflow-x-auto">
        {expanded ? full : preview}
        {truncated && !expanded && '...'}
      </pre>
      {truncated && (
        <button onClick={() => setExpanded((v) => !v)} className="mt-1 flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300">
          {expanded ? <><ChevronUp size={12} /> Réduire</> : <><ChevronDown size={12} /> Voir tout</>}
        </button>
      )}
    </div>
  );
}

function AgentCard({ agent }) {
  const { id, label, description, icon: Icon, color, border, hasInput, inputLabel, inputPlaceholder } = agent;
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (id === 'support') {
        return api.post('/agents/support', { question: input }).then((r) => r.data);
      }
      const body = id === 'seo' && input ? { matchId: input } : {};
      return api.post(`/agents/run/${id}`, body).then((r) => r.data);
    },
    onSuccess: (data) => setResult(data.data),
  });

  return (
    <div className={`bg-surface-800 border ${border || 'border-surface-700'} rounded-2xl p-5 flex flex-col gap-4`}>
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl shrink-0 ${color}`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-100 text-sm">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>

      {hasInput && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">{inputLabel}</label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={inputPlaceholder}
            className="w-full bg-surface-700 border border-surface-600 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500/50"
          />
        </div>
      )}

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || (hasInput && !input.trim())}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500/15 border border-primary-500/25 text-primary-400 text-sm font-semibold hover:bg-primary-500/25 transition-colors disabled:opacity-40"
      >
        {mutation.isPending
          ? <><RefreshCw size={14} className="animate-spin" /> En cours…</>
          : mutation.isSuccess
          ? <><Check size={14} className="text-primary-400" /> Terminé</>
          : mutation.isError
          ? <><X size={14} className="text-red-400" /> Erreur</>
          : <><Play size={14} /> Lancer</>
        }
      </button>

      {mutation.isError && (
        <p className="text-xs text-red-400">{mutation.error?.response?.data?.message || 'Erreur lors de l\'exécution'}</p>
      )}

      {result && <ResultBlock result={result} />}
    </div>
  );
}

function OrchestratorCard() {
  const [instruction, setInstruction] = useState('');
  const [result, setResult] = useState(null);

  const mutation = useMutation({
    mutationFn: () => api.post('/agents/orchestrer', { instruction }).then((r) => r.data),
    onSuccess: (data) => setResult(data.data),
  });

  return (
    <div className="bg-surface-800 border border-primary-500/25 rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl shrink-0 bg-primary-500/20 text-primary-400">
          <Bot size={18} />
        </div>
        <div>
          <p className="font-semibold text-gray-100 text-sm">Orchestrateur</p>
          <p className="text-xs text-gray-500 mt-0.5">Donnez une instruction en langage naturel — l'orchestrateur choisit et coordonne les bons agents</p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Instruction</label>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          rows={2}
          placeholder="Ex: génère les posts du jour et le classement tipsters de la semaine"
          className="w-full bg-surface-700 border border-surface-600 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500/50 resize-none"
        />
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !instruction.trim()}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-primary-500/20 border border-primary-500/30 text-primary-300 text-sm font-semibold hover:bg-primary-500/30 transition-colors disabled:opacity-40"
      >
        {mutation.isPending
          ? <><RefreshCw size={14} className="animate-spin" /> Orchestration en cours…</>
          : <><Bot size={14} /> Lancer l'orchestrateur</>
        }
      </button>

      {mutation.isError && (
        <p className="text-xs text-red-400">{mutation.error?.response?.data?.message || 'Erreur'}</p>
      )}

      {result && (
        <div className="space-y-3">
          {result.synthese && (
            <div className="bg-surface-900 rounded-xl p-4 border border-surface-600">
              <p className="text-xs font-semibold text-primary-400 mb-2 uppercase tracking-wider">Synthèse</p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{result.synthese}</p>
            </div>
          )}
          <p className="text-xs text-gray-600">{result.tours} tour(s) d'orchestration</p>
        </div>
      )}
    </div>
  );
}

function PushBroadcastCard() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post('/admin/push/broadcast', { title, body, url: url || undefined }).then((r) => r.data),
    onSuccess: () => { setTitle(''); setBody(''); setUrl(''); },
  });

  return (
    <div className="bg-surface-800 border border-amber-500/25 rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl shrink-0 bg-amber-500/20 text-amber-400">
          <Bell size={18} />
        </div>
        <div>
          <p className="font-semibold text-gray-100 text-sm">Envoyer une notification push</p>
          <p className="text-xs text-gray-500 mt-0.5">Diffuse une notification à tous les abonnés aux notifications</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Titre *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: ⚽ Résultats du soir disponibles"
            maxLength={80}
            className="w-full bg-surface-700 border border-surface-600 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Message *</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ex: Consultez les analyses de la journée sur Pronix"
            maxLength={180}
            rows={2}
            className="w-full bg-surface-700 border border-surface-600 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500/50 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Lien (optionnel)</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/matchs"
            className="w-full bg-surface-700 border border-surface-600 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !title.trim() || !body.trim()}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400 text-sm font-semibold hover:bg-amber-500/25 transition-colors disabled:opacity-40"
      >
        {mutation.isPending
          ? <><RefreshCw size={14} className="animate-spin" /> Envoi en cours…</>
          : mutation.isSuccess
          ? <><Check size={14} /> {mutation.data?.message || 'Envoyé'}</>
          : <><Bell size={14} /> Envoyer la notification</>
        }
      </button>

      {mutation.isError && (
        <p className="text-xs text-red-400">{mutation.error?.response?.data?.message || 'Erreur lors de l\'envoi'}</p>
      )}
    </div>
  );
}

export default function AdminAgents() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-50">Agents IA</h1>
        <p className="text-sm text-gray-500 mt-0.5">Lancez manuellement les agents ou utilisez l'orchestrateur en langage naturel</p>
      </div>

      <div className="bg-surface-800/50 border border-surface-700 rounded-2xl p-4 text-sm text-gray-400 space-y-1">
        <p className="font-medium text-gray-300">Planification automatique</p>
        <p>• <span className="text-gray-300">6h00</span> — Agent SEO (contenu page du dernier match terminé)</p>
        <p>• <span className="text-gray-300">7h00</span> — Agent Contenu (posts réseaux sociaux du jour)</p>
        <p>• <span className="text-gray-300">Lundi 8h00</span> — Agent Analyse (classement tipsters hebdomadaire)</p>
      </div>

      {/* Push notifications */}
      <PushBroadcastCard />

      {/* Orchestrateur */}
      <OrchestratorCard />

      {/* Agents individuels */}
      <div>
        <h2 className="font-semibold text-gray-300 text-sm mb-3">Agents individuels</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {AGENTS.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  );
}
