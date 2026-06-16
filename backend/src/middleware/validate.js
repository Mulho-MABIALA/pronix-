const { ZodError } = require('zod');

// Middleware de validation avec un schéma Zod
// source : 'body' | 'query' | 'params'
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const result = schema.parse(req[source]);
      req[source] = result; // données nettoyées et typées
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Données invalides',
          errors: err.flatten().fieldErrors,
        });
      }
      next(err);
    }
  };
}

module.exports = { validate };
