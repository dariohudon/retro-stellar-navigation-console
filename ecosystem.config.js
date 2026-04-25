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
        // NASA_API_KEY: "your-key-here",  // optional — defaults to DEMO_KEY (30 req/hr)
      },
    },
  ],
};
