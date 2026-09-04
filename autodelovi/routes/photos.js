const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

const uploadLog  = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60_000;

module.exports = function (router) {

  // POST /photos — prima base64 sliku, čuva na disk, vraća {url}
  router.post('/photos', async (req, res, body) => {
    const ip  = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const log = (uploadLog.get(ip) || []).filter(t => now - t < RATE_WINDOW);
    if (log.length >= RATE_LIMIT) {
      const e = new Error('Previše zahteva. Pokušajte za minut.'); e.status = 429; throw e;
    }
    log.push(now);
    uploadLog.set(ip, log);

    const { data } = body;
    if (!data || typeof data !== 'string') {
      const e = new Error('data polje sa base64 slikom je obavezno'); e.status = 400; throw e;
    }

    // Očekujemo data:image/jpeg;base64,... ili data:image/png;base64,...
    const match = data.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/);
    if (!match) {
      const e = new Error('data mora biti data:image/jpeg;base64,... format'); e.status = 400; throw e;
    }

    const ext      = match[1].replace('image/', '').replace('jpeg', 'jpg');
    const b64      = match[2];
    const buf      = Buffer.from(b64, 'base64');

    if (buf.length > 3 * 1024 * 1024) {
      const e = new Error('Slika je prevelika (max 3 MB)'); e.status = 413; throw e;
    }

    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

    const filename = `foto-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buf);

    res.json(201, { url: `/uploads/${filename}` });
  });
};
