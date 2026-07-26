const express = require('express');
const axios = require('axios');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Domaines externes autorisés à être proxifiés (whitelist stricte anti-SSRF)
const ALLOWED_HOSTS = new Set(['media.api-sports.io']);

// GET /api/img-proxy?url=<url encodée>
// Sert une image externe depuis notre propre domaine (same-origin) pour éviter
// qu'un <canvas> qui la dessine soit "tainted" (le ticket partagé a besoin de
// canvas.toBlob(), impossible avec des images cross-origin sans CORS).
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

    const upstream = await axios.get(parsed.toString(), {
      responseType: 'arraybuffer',
      timeout: 8000,
      maxContentLength: 5 * 1024 * 1024, // 5 Mo max
    });

    res.set('Content-Type', upstream.headers['content-type'] || 'image/png');
    res.set('Cache-Control', 'public, max-age=604800, immutable'); // 7 jours
    res.send(Buffer.from(upstream.data));
  } catch (err) {
    if (err.response) {
      // L'hôte distant a répondu avec une erreur (404, etc.) — ne pas planter, juste 404
      return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Image introuvable' });
    }
    next(err);
  }
});

module.exports = router;
