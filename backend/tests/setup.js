// Charge les variables d'environnement de test sans connexion DB réelle
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests_only';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_for_unit_tests';
process.env.GENIUSPAY_WEBHOOK_SECRET = 'test_webhook_secret_32_chars_min!';
process.env.GENIUSPAY_API_KEY = '';
process.env.GENIUSPAY_API_SECRET = '';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.APP_NAME = 'fpronix';
process.env.PORT = '5001';
