// Convertit une chaine (ex: nom de competition) en slug URL-friendly.
// Doit rester identique a frontend/src/utils/slugify.js pour que les slugs
// generes cote serveur (sitemap) soient resolus correctement cote client.
function slugify(str) {
  return (str || '')
    .toString()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // enleve les accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = { slugify };
