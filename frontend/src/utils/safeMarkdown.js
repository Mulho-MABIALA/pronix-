// ─── Rendu Markdown SÛR pour les articles de blog ─────────────────────────────
// Le contenu des articles vient de l'IA ou de l'admin. Avant, il était injecté
// tel quel en HTML : une balise <script> ou <img onerror=…> glissée dans un
// article (par exemple reprise d'une actualité externe) se serait exécutée
// chez chaque lecteur. Ici, TOUT est d'abord échappé, puis seul un petit
// sous-ensemble de Markdown est reconverti en HTML contrôlé.
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

function inline(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>');
}

export function renderSafeMarkdown(src) {
  const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let list = null;
  let para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br/>')}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`); list = null; } };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = /^(#{2,3})\s+(.*)$/.exec(line);
    const li = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (h) { flushPara(); flushList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    if (/^#\s+/.test(line)) { flushPara(); flushList(); out.push(`<h2>${inline(line.replace(/^#\s+/, ''))}</h2>`); continue; }
    if (li) { flushPara(); (list ||= []).push(li[1]); continue; }
    if (line.trim() === '') { flushPara(); flushList(); continue; }
    flushList();
    para.push(line);
  }
  flushPara(); flushList();
  return out.join('\n');
}
