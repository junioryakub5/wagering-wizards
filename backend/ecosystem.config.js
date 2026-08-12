module.exports = {
  apps: [
    {
      name        : 'wagering-wizards-api',
      script      : 'server.js',
      instances   : 1,
      autorestart : true,
      watch       : false,
      max_memory_restart: '512M',
      // Restart if the process crashes more than 10 times in 15 minutes
      max_restarts: 10,
      min_uptime  : '10s',
      env: {
        NODE_ENV : 'production',
        PORT     : 5001,
      },
    },
  ],
};
