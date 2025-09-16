import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchByFraction } from './api.js';

const app = express();

// __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir a pasta /web
const webDir = path.join(__dirname, '..', 'web');
app.use(express.static(webDir));

// Rota raiz -> index.html
app.get('/', (_req, res) => {
  res.sendFile(path.join(webDir, 'index.html'));
});

// API
app.get('/api/card', async (req, res) => {
  try {
    const { fraction } = req.query;
    if (!fraction || !fraction.includes('/')) {
      return res.status(400).json({ error: 'Parâmetro fraction inválido (ex.: 032/168)' });
    }
    const data = await searchByFraction(String(fraction));
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Health (opcional)
app.get('/healthz', (_req, res) => res.send('ok'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
