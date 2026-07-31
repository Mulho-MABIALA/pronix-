import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PlusCircle, Edit2, Trash2, Eye, EyeOff, X, Save } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const EMPTY_POST = {
  title: '', slug: '', content: '', excerpt: '',
  coverImage: '', category: 'general', published: false,
  metaTitle: '', metaDesc: '',
};

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

function PostEditor({ initial = EMPTY_POST, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleTitleChange = (e) => {
    set('title', e.target.value);
    if (!initial.id) set('slug', slugify(e.target.value));
  };

  return (
    <div className="bento-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-ink-1">{initial.id ? 'Modifier l\'article' : 'Nouvel article'}</h3>
        <button onClick={onCancel} className="text-ink-3 hover:text-ink-2"><X size={16} /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs text-ink-4 mb-1">Titre *</label>
          <input
            value={form.title}
            onChange={handleTitleChange}
            className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-ink-1 focus:outline-none focus:border-primary-500"
            placeholder="Titre de l'article"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-4 mb-1">Slug *</label>
          <input
            value={form.slug}
            onChange={(e) => set('slug', e.target.value)}
            className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-ink-1 focus:outline-none focus:border-primary-500 font-mono"
            placeholder="mon-article"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-4 mb-1">Catégorie</label>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-ink-1 focus:outline-none focus:border-primary-500"
          >
            {['general', 'analyse', 'pronostic', 'actualite', 'conseil'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-ink-4 mb-1">Résumé (excerpt)</label>
          <textarea
            value={form.excerpt}
            onChange={(e) => set('excerpt', e.target.value)}
            rows={2}
            className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-ink-1 focus:outline-none focus:border-primary-500 resize-none"
            placeholder="Court résumé visible en liste…"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-ink-4 mb-1">Contenu *</label>
          <textarea
            value={form.content}
            onChange={(e) => set('content', e.target.value)}
            rows={10}
            className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-ink-1 focus:outline-none focus:border-primary-500 resize-y font-mono"
            placeholder="Contenu de l'article (HTML ou texte brut)…"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-4 mb-1">Image de couverture (URL)</label>
          <input
            value={form.coverImage}
            onChange={(e) => set('coverImage', e.target.value)}
            className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-ink-1 focus:outline-none focus:border-primary-500"
            placeholder="https://..."
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => set('published', e.target.checked)}
              className="w-4 h-4 rounded accent-primary-500"
            />
            <span className="text-sm text-ink-3">Publier immédiatement</span>
          </label>
        </div>
        <div>
          <label className="block text-xs text-ink-4 mb-1">Meta title (SEO)</label>
          <input
            value={form.metaTitle}
            onChange={(e) => set('metaTitle', e.target.value)}
            className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-ink-1 focus:outline-none focus:border-primary-500"
            placeholder="Titre SEO (max 70 car.)"
            maxLength={70}
          />
        </div>
        <div>
          <label className="block text-xs text-ink-4 mb-1">Meta description (SEO)</label>
          <input
            value={form.metaDesc}
            onChange={(e) => set('metaDesc', e.target.value)}
            className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-ink-1 focus:outline-none focus:border-primary-500"
            placeholder="Description SEO (max 160 car.)"
            maxLength={160}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-surface-700">
        <button onClick={onCancel} className="text-sm px-4 py-2 rounded-xl bg-surface-700 text-ink-3 hover:bg-surface-600">
          Annuler
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={isSaving || !form.title || !form.slug || !form.content}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-primary-500 text-white hover:bg-primary-400 disabled:opacity-40"
        >
          <Save size={14} />
          {isSaving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}

export default function AdminBlog() {
  const [editing, setEditing] = useState(null); // null | 'new' | post object
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const toast = (msg, type = 'success') => showToast(msg, type);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-blog'],
    queryFn: () => api.get('/blog/admin/all').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/blog', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog'] });
      setEditing(null);
      toast('Article créé');
    },
    onError: (err) => toast(err.response?.data?.message || 'Erreur', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/blog/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog'] });
      setEditing(null);
      toast('Article mis à jour');
    },
    onError: (err) => toast(err.response?.data?.message || 'Erreur', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/blog/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog'] });
      toast('Article supprimé');
    },
  });

  const handleSave = (form) => {
    if (editing?.id) {
      updateMutation.mutate({ id: editing.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const posts = data?.data || [];
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink-1">Blog SEO</h1>
          <p className="text-sm text-ink-3 mt-0.5">{posts.length} article{posts.length !== 1 ? 's' : ''}</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing('new')}
            className="flex items-center gap-2 text-sm font-semibold px-3.5 py-2 rounded-xl bg-primary-500 text-white hover:bg-primary-400 transition-colors"
          >
            <PlusCircle size={15} />
            Nouvel article
          </button>
        )}
      </div>

      {editing && (
        <PostEditor
          initial={editing === 'new' ? EMPTY_POST : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          isSaving={isSaving}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-xl" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bento-card text-center py-12 text-ink-3">
          Aucun article. Créez votre premier article !
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div key={post.id} className="bento-card flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${post.published ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <p className="text-sm font-medium text-ink-1 truncate">{post.title}</p>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-ink-3">
                  <span className="capitalize">{post.category}</span>
                  <span>/blog/{post.slug}</span>
                  {post.publishedAt && (
                    <span>{format(new Date(post.publishedAt), 'dd MMM yyyy', { locale: fr })}</span>
                  )}
                  <span className="flex items-center gap-1"><Eye size={10} />{post.views}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => updateMutation.mutate({ id: post.id, published: !post.published })}
                  className="p-1.5 rounded-lg text-ink-3 hover:text-ink-2 hover:bg-surface-700 transition-colors"
                  title={post.published ? 'Dépublier' : 'Publier'}
                >
                  {post.published ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  onClick={() => setEditing(post)}
                  className="p-1.5 rounded-lg text-ink-3 hover:text-primary-400 hover:bg-surface-700 transition-colors"
                  title="Modifier"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Supprimer cet article ?')) deleteMutation.mutate(post.id);
                  }}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-surface-700 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
