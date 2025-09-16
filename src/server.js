import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchByFraction, searchSetsByName, searchCardsBySet } from './api.js';

const app = express();

// __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// servir /web
const webDir = path.join(__dirname, '..', 'web');
app.use(express.static(webDir));
app.get('/', (_req, res) => res.sendFile(path.join(webDir, 'index.html')));

// === Número/Total
app.get('/api/card', async (req, res) => {
  const fraction = String(req.query.fraction || '');
  const start = Date.now();
  try {
    const data = await searchByFraction(fraction);
    res.json({ data, tookMs: Date.now() - start });
  } catch (e) {
    // se a api.js lançar INVALID_FRACTION, devolvemos 400
    if (e.code === 'INVALID_FRACTION' || String(e.message || '').startsWith('INVALID_FRACTION')) {
      return res.status(400).json({ error: e.message.replace('INVALID_FRACTION:','').trim() });
    }
    res.status(500).json({ error: e.message });
  }
});

// === Sets por nome
app.get('/api/sets', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Use ?q=nome-da-colecao' });
    const out = await searchSetsByName(q);
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === Cards de um set + filtros de raridade + paginação
app.get('/api/cardsBySet', async (req, res) => {
  try {
    const setId = String(req.query.setId || '').trim();
    const rarities = String(req.query.rarities || '').split(',').map(s => s.trim()).filter(Boolean);
    const page = parseInt(String(req.query.page || '1'), 10) || 1;
    const pageSize = parseInt(String(req.query.pageSize || '60'), 10) || 60;

    if (!setId) return res.status(400).json({ error: 'Parâmetro setId é obrigatório' });

    const out = await searchCardsBySet({ setId, rarities, page, pageSize });
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// health
app.get('/healthz', (_req, res) => res.send('ok'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
