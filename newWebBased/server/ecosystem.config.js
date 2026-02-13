module.exports = {
  apps: [
    {
      name: 'turnfix-server',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
        // DB connection string is loaded from .env file - NEVER hardcode it here!
        // PM2's env section overrides .env values, causing wrong DB after wizard creates a new one.
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 2000,  // Wait 2 seconds before restart (reduced from 4s)
      kill_timeout: 10000,   // Wait 10 seconds for graceful shutdown (increased from 5s)
      listen_timeout: 5000,  // Wait 5 seconds for server to start listening (increased from 3s)
      // Restart if memory exceeds 500MB
      max_memory_restart: '500M',
      // Exponential backoff for restarts
      exp_backoff_restart_delay: 100,
      // Stop restart attempts after 10 failures
      stop_exit_codes: [0]
    },
    // Jury-Server für Wettkampftag
    {
      name: 'turnfix-jury-server',
      script: '../jury-server/src/index.js',
      cwd: '../jury-server',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3002
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 2000,   // Wait 2 seconds before restart (reduced from 4s)
      kill_timeout: 10000,   // Wait 10 seconds for graceful shutdown (increased from 5s)
      listen_timeout: 5000,  // Wait 5 seconds for server to start listening (increased from 3s)
      max_memory_restart: '300M',
      exp_backoff_restart_delay: 100,
      stop_exit_codes: [0]
    }
  ]
};
