/* PM2 ecosystem — AutoUniverse (svi serveri)
   Deploy: pm2 start ecosystem.config.js --env production
   Save:   pm2 save && pm2 startup
*/

const BASE = '/var/www/autouniverse';

module.exports = {
  apps: [
    {
      name:    'aucore',
      script:  'server.js',
      cwd:     `${BASE}/aucore`,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env_production: { NODE_ENV: 'production', PORT: 3000 },
      error_file:      '/var/log/pm2/aucore-error.log',
      out_file:        '/var/log/pm2/aucore-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
    {
      name:    'autopijaca',
      script:  'server.js',
      cwd:     `${BASE}/autopijaca`,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '128M',
      env_production: { NODE_ENV: 'production', PORT: 3001 },
      error_file:      '/var/log/pm2/autopijaca-error.log',
      out_file:        '/var/log/pm2/autopijaca-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
    {
      name:    'autodelovi',
      script:  'server.js',
      cwd:     `${BASE}/autodelovi`,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '128M',
      env_production: { NODE_ENV: 'production', PORT: 3002 },
      error_file:      '/var/log/pm2/autodelovi-error.log',
      out_file:        '/var/log/pm2/autodelovi-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
