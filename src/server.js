import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchByFraction, searchSetsByName, searchCardsBySet, getRarities } from './api.js';

const app = express();

// __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// servir /web
const webDir = path.join(__dirname, '..', 'web');
app.use(express.static(webDir));

app.get('/', (_req, res) => res.sendFile(path.join(webDir, 'index.html')));

// ===== API existente: busca por número/total =====
app.get('/api/card', async (req, res) => {
  const fraction = String(req.query.fraction || '');
  try {
    const data = await searchByFraction(fraction);
    res.json({ data });
  } catch (e) {
    const msg = String(e.message || '');
    if (e.code === 'INVALID_FRACTION' || msg.startsWith('INVALID_FRACTION')) {
      return res.status(400).json({ error: msg.replace('INVALID_FRACTION:','').trim() });
    }
    // se for timeout explícito, comunica claro
    if (/Timeout/i.test(msg) || /AbortError/.test(msg)) {
      return res.status(504).json({ error: 'A API oficial do Pokémon TCG demorou para responder. Tente novamente (já colocamos novas tentativas automáticas).' });
    }
    res.status(500).json({ error: msg });
  }
});

// ===== NOVO: busca de sets por nome =====
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

// ===== busca raridade =====

app.get('/api/rarities', async (_req, res) => {
  try {
    const list = await getRarities();
    res.json({ data: list });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== NOVO: cards por set + raridades + paginação =====
app.get('/api/cardsBySet', async (req, res) => {
  try {
    const setId = String(req.query.setId || '').trim();
    const rarities = String(req.query.rarities || '').trim()
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const page = parseInt(String(req.query.page || '1'), 10) || 1;
    const pageSize = parseInt(String(req.query.pageSize || '60'), 10) || 60;

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
