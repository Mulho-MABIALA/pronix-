const express = require('express');
const axios = require('axios');
const sharp = require('sharp');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Domaines externes autorisés à être proxifiés (whitelist stricte anti-SSRF)
const ALLOWED_HOSTS = new Set(['media.api-sports.io']);

// Tailles de redimensionnement acceptées (évite qu'un client demande n'importe
// quelle taille et fasse exploser le cache / le CPU de sharp)
const MIN_SIZE = 16;
const MAX_SIZE = 256;

// Cache mémoire simple des images déjà redimensionnées (clé = url + taille).
// Petit volume (logos d'équipes, quelques centaines max) donc pas besoin de
// Redis/disque — un Map suffit et survit tant que le process pronix-api tourne.
const resizeCache = new Map();
const RESIZE_CACHE_MAX_ENTRIES = 2000;

// GET /api/img-proxy?url=<url encodée>&w=<taille>
// Sert une image externe depuis notre propre domaine (same-origin) pour éviter
// qu'un <canvas> qui la dessine soit "tainted" (le ticket partagé a besoin de
// canvas.toBlob(), impossible avec des images cross-origin sans CORS).
//
// Si "w" est fourni, l'image est aussi redimensionnée côté serveur : les logos
// d'équipe (media.api-sports.io) pèsent 20-90 Ko en pleine résolution alors
// qu'ils s'affichent en 26-35px dans l'app — un audit PageSpeed a chiffré
// ~600 Ko d'économie possible en les servant déjà à la bonne taille.
router.get('/', async (req, res, next) => {
  try {
    const raw = req.query.url;
    if (!raw || typeof raw !== 'string') {
      throw new AppError('Paramètre url manquant', 400, 'BAD_REQUEST');
    }

    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      throw new AppError('URL invalide', 400, 'BAD_REQUEST');
    }

    if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
      throw new AppError('Domaine non autorisé', 403, 'FORBIDDEN');
    }

    // Taille demandée (optionnelle) — clampée pour rester raisonnable
    let width = parseInt(req.query.w, 10);
    if (Number.isFinite(width) && width > 0) {
      width = Math.min(MAX_SIZE, Math.max(MIN_SIZE, width));
    } else {
      width = null;
    }

    const cacheKey = `${parsed.toString()}|${width || 'orig'}`;
    const cached = resizeCache.get(cacheKey);
    if (cached) {
      res.set('Content-Type', cached.contentType);
      res.set('Cache-Control', 'public, max-age=604800, immutable');
      res.set('X-Img-Cache', 'HIT');
      return res.send(cached.buffer);
    }

    const upstream = await axios.get(parsed.toString(), {
      responseType: 'arraybuffer',
      timeout: 8000,
      maxContentLength: 5 * 1024 * 1024, // 5 Mo max
    });

    let outBuffer = Buffer.from(upstream.data);
    let contentType = upstream.headers['content-type'] || 'image/png';

    if (width) {
      // @2x pour rester net sur écrans à forte densité de pixels, sans
      // dépasser la taille de la source d'origine (pas d'agrandissement)
      const targetWidth = width * 2;
      outBuffer = await sharp(outBuffer)
        .resize({ width: targetWidth, withoutEnlargement: true })
        .png({ quality: 90, compressionLevel: 9 })
        .toBuffer();
      contentType = 'image/png';
    }

    if (resizeCache.size >= RESIZE_CACHE_MAX_ENTRIES) {
      resizeCache.delete(resizeCache.keys().next().value); // purge la plus ancienne
    }
    resizeCache.set(cacheKey, { buffer: outBuffer, contentType });

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=604800, immutable'); // 7 jours
    res.set('X-Img-Cache', 'MISS');
    res.send(outBuffer);
  } catch (err) {
    if (err.response) {
      // L'hôte distant a répondu avec une erreur (404, etc.) — ne pas planter, juste 404
      return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Image introuvable' });
    }
    next(err);
  }
});

module.exports = router;
