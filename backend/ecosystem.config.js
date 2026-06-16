module.exports = {
  apps: [
    {
      name: 'pronix-api',
      script: 'src/app.js',
      cwd: '/var/www/pronix/backend',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      // Redémarre si le process consomme plus de 500 Mo
      max_memory_restart: '500M',
      // Logs
      out_file: '/var/log/pronix/app.log',
      error_file: '/var/log/pronix/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      // Redémarrage automatique si crash
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
