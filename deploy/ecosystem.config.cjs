module.exports = {
  apps: [
    {
      name: 'crm',
      // Change this if you cloned the repo somewhere other than ~/crm
      cwd: '/root/crm/server',
      script: 'src/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '900M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
