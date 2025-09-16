import 'dotenv/config';
import express from 'express';
import { searchByFraction } from './api.js';

const app = express();

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
