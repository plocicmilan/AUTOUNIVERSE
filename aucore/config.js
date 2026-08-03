/* Čita .env iz istog foldera — bez dotenv zavisnosti */
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) return;
    const eq = clean.indexOf('=');
    if (eq < 0) return;
    const key = clean.slice(0, eq).trim();
    const val = clean.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  });
}

module.exports = {
  PORT:               process.env.PORT               || '3000',
  BREVO_API_KEY:      process.env.BREVO_API_KEY       || '',
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL  || '',
  BREVO_SENDER_NAME:  process.env.BREVO_SENDER_NAME   || 'AutoUniverse',
  HUB_BASE_URL:       process.env.HUB_BASE_URL        || 'http://localhost:3000',
};
