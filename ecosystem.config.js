module.exports = {
  apps: [
    {
      name: "retro-stellar-console",
      script: ".next/standalone/server.js",
      cwd: "/var/www/retro-stellar-console",
      env: {
        NODE_ENV: "production",
        PORT: 3007,
        HOSTNAME: "0.0.0.0",
        // Get a free key at https://api.nasa.gov/ (60 req/hr vs DEMO_KEY's 10 req/hr)
        // NASA_API_KEY: "PASTE_YOUR_KEY_HERE",
      },
    },
  ],
};
