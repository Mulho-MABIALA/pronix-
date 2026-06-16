const { ZodError } = require('zod');

// Classe d'erreur métier personnalisée
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

// Middleware de gestion globale des erreurs
function errorHandler(err, req, res, next) {
  // Erreurs de validation Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Données invalides',
      errors: err.flatten().fieldErrors,
    });
  }

  // Erreurs Prisma connues
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'champ';
    return res.status(409).json({
      success: false,
      code: 'DUPLICATE_ENTRY',
      message: `Cette valeur est déjà utilisée pour le champ : ${field}`,
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: 'Ressource introuvable',
    });
  }

  // Erreurs applicatives (AppError)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }

  // Erreurs inattendues — ne pas exposer les détails en production
  console.error('Erreur non gérée:', err);
  return res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erreur interne du serveur',
  });
}

module.exports = { errorHandler, AppError };
