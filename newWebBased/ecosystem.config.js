module.exports = {
  apps: [
    {
      name: 'turnfix-server',
      script: 'dist/index.js',
      cwd: './server',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'turnfix-jury-server',
      script: 'src/index.js',
      cwd: './jury-server',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        JURY_PORT: 3002,
        MAIN_SERVER_URL: 'http://localhost:3001'
      },
      env_development: {
        NODE_ENV: 'development',
        JURY_PORT: 3002,
        MAIN_SERVER_URL: 'http://localhost:3001'
      },
      env_production: {
        NODE_ENV: 'production',
        JURY_PORT: 3002,
        MAIN_SERVER_URL: 'http://localhost:3001'
      },
      error_file: './logs/jury-error.log',
      out_file: './logs/jury-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
