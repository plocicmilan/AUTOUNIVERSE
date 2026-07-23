const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

module.exports = function (router) {

  // POST /photos — prima base64 sliku, čuva na disk, vraća {url}
  router.post('/photos', async (req, res, body) => {
    const { data } = body;
    if (!data || typeof data !== 'string') {
      const e = new Error('data polje sa base64 slikom je obavezno'); e.status = 400; throw e;
    }

    const match = data.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/);
    if (!match) {
      const e = new Error('data mora biti data:image/jpeg;base64,... format'); e.status = 400; throw e;
    }

    const ext = match[1].replace('image/', '').replace('jpeg', 'jpg');
    const buf = Buffer.from(match[2], 'base64');

    if (buf.length > 3 * 1024 * 1024) {
      const e = new Error('Slika je prevelika (max 3 MB)'); e.status = 413; throw e;
    }

    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

    const filename = `foto-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buf);

    res.json(201, { url: `/uploads/${filename}` });
  });
};
