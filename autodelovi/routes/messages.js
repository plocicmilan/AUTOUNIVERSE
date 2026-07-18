const { getDb } = require('../db');

module.exports = function (router) {

  // POST /parts/:id/messages — kupac šalje upit prodavcu (javno, bez auth)
  router.post('/parts/:id/messages', async (req, res, body, params) => {
    const { buyer_name, buyer_phone, content } = body;

    if (!buyer_name || !content) {
      const e = new Error('buyer_name i content su obavezni');
      e.status = 400; throw e;
    }

    const db = getDb();
    const part = db.prepare(`SELECT id, status FROM parts WHERE id = ?`).get(params.id);
    if (!part) { const e = new Error('Oglas ne postoji'); e.status = 404; throw e; }
    if (part.status !== 'active') { const e = new Error('Oglas nije aktivan'); e.status = 400; throw e; }

    const result = db.prepare(`
      INSERT INTO messages (part_id, buyer_name, buyer_phone, content)
      VALUES (?, ?, ?, ?)
    `).run(params.id, buyer_name, buyer_phone ?? null, content);

    res.json(201, { id: result.lastInsertRowid, ok: true });
  });

  // PUT /parts/:id/messages/:msg_id/read — prodavac označava poruku kao pročitanu
  router.put('/parts/:id/messages/:msg_id/read', async (req, res, body, params) => {
    const token = req.headers['x-seller-token'];
    if (!token) { const e = new Error('x-seller-token header obavezan'); e.status = 401; throw e; }

    const db = getDb();
    const part = db.prepare(`SELECT id, seller_token FROM parts WHERE id = ?`).get(params.id);
    if (!part) { const e = new Error('Oglas ne postoji'); e.status = 404; throw e; }
    if (part.seller_token !== token) { const e = new Error('Unauthorized'); e.status = 403; throw e; }

    db.prepare(`UPDATE messages SET read = 1 WHERE id = ? AND part_id = ?`).run(params.msg_id, params.id);
    res.json(200, { ok: true });
  });
};
