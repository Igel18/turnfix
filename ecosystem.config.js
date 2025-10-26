module.exports = {
  apps: [
    {
      name: 'turnfix-server',
      script: './newWebBased/server/dist/index.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './newWebBased/server/logs/err.log',
      out_file: './newWebBased/server/logs/out.log',
      log_file: './newWebBased/server/logs/combined.log'
    },
    {
      name: 'turnfix-jury-server',
      script: './newWebBased/server/dist/index.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        JURY_MODE: 'true'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './newWebBased/server/logs/jury-err.log',
      out_file: './newWebBased/server/logs/jury-out.log',
      log_file: './newWebBased/server/logs/jury-combined.log'
    }
  ]
};