/**
 * PM2 config cho backend Teyvat Card Game.
 *
 * Trên server (sau khi pull/build):
 *   cd /var/www/TeyvatCardGameBackend/server
 *   npm ci
 *   npm run build
 *   pm2 start ecosystem.config.cjs
 *
 * Xem lỗi / log:
 *   pm2 logs teyvat-backend          # realtime (stdout + stderr)
 *   pm2 logs teyvat-backend --err     # chỉ stderr
 *   pm2 logs teyvat-backend --lines 200
 *   tail -f ~/.pm2/logs/teyvat-backend-error.log
 *   tail -f ~/.pm2/logs/teyvat-backend-out.log
 */
module.exports = {
  apps: [
    {
      name: 'teyvat-backend',
      cwd: __dirname,
      script: 'dist/index.js',
      node_args: '--enable-source-maps',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: { NODE_ENV: 'development' },
      env_production: { NODE_ENV: 'production' },
      merge_logs: true,
      error_file: '~/.pm2/logs/teyvat-backend-error.log',
      out_file: '~/.pm2/logs/teyvat-backend-out.log',
    },
  ],
};
