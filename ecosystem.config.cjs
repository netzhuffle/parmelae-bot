module.exports = {
  apps: [{
    name: 'parmelae-bot',
    // Direct TypeScript execution with Bun
    // Note: src/index.ts must remain a sync module (no top-level await)
    // to avoid pm2's require-in-the-middle instrumentation errors
    script: 'src/index.ts',
    interpreter: '/home/jannis/.bun/bin/bun',
    cwd: '/home/jannis/parmelae-bot',
    env: {
      NODE_ENV: 'production'
    },
    // PM2 options
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    // Logging
    log_file: '/home/jannis/.pm2/logs/parmelae-bot.log',
    out_file: '/home/jannis/.pm2/logs/parmelae-bot-out.log',
    error_file: '/home/jannis/.pm2/logs/parmelae-bot-error.log',
    time: true
  }]
};