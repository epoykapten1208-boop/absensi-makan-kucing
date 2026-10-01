require('dotenv').config();
const express = require('express'), crypto = require('crypto'), { Pool } = require('pg');
const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const SECRET = process.env.SECRET || 'secret', SESI = ['pagi', 'siang', 'malam'];

app.use(express.json({ limit: '6mb' }));
app.use(express.static('public'));

const sign = (p) => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', SECRET).update(b).digest('base64url'); };
function auth(req, res, next) {
  try {
    const [b, s] = (req.headers.authorization || '').replace('Bearer ', '').split('.');
    const ok = crypto.createHmac('sha256', SECRET).update(b).digest('base64url') === s;
    if (ok && JSON.parse(Buffer.from(b, 'base64url')).exp > Date.now()) return next();
  } catch (e) {}
  res.status(401).json({ error: 'Belum login' });
}

app.post('/api/absen', async (req, res) => {
  const { nama, sesi, foto } = req.body || {};
  if (!nama || !nama.trim()) return res.status(400).json({ error: 'Nama wajib diisi' });
  if (!SESI.includes(sesi)) return res.status(400).json({ error: 'Pilih sesi makan' });
  if (!foto || !/^data:image\//.test(foto)) return res.status(400).json({ error: 'Foto bukti wajib diunggah' });
  try {
    await pool.query('INSERT INTO absensi (nama, sesi, foto) VALUES ($1,$2,$3)', [nama.trim().slice(0, 80), sesi, foto]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Gagal menyimpan ke database' }); }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === (process.env.ADMIN_USERNAME || 'admin') && password === (process.env.ADMIN_PASSWORD || 'meong123'))
    return res.json({ token: sign({ exp: Date.now() + 8 * 3600 * 1000 }) });
  res.status(401).json({ error: 'Username atau password salah' });
});

app.get('/api/admin/absensi', auth, async (req, res) => {
  const { rows } = await pool.query(`SELECT id, nama, sesi, foto,
    to_char(created_at AT TIME ZONE 'Asia/Jakarta','DD Mon YYYY, HH24:MI:SS') || ' WIB' AS waktu
    FROM absensi ORDER BY created_at DESC LIMIT 200`);
  res.json(rows);
});

app.delete('/api/admin/absensi/:id', auth, async (req, res) => {
  await pool.query('DELETE FROM absensi WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// Otomatis buat tabel jika belum ada
pool.query(`CREATE TABLE IF NOT EXISTS absensi (id SERIAL PRIMARY KEY, nama TEXT NOT NULL, sesi TEXT NOT NULL,
  foto TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`).catch(e => console.error('Gagal buat tabel:', e.message));

// Agar bisa berjalan di Vercel (Serverless) DAN tetap bisa di-run lokal via 'node server.js'
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log('Jalan di http://localhost:' + PORT));
}

module.exports = app;