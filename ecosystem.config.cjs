/**
 * PM2 ecosystem file for production.
 * Usage: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: "deckdeals",
      script: "app.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
