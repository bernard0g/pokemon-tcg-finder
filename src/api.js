import 'dotenv/config';
import fetch from 'node-fetch';

const BASE = 'https://api.pokemontcg.io/v2/cards';

function buildQueryFromFraction(fraction) {
  const [numRaw, totalRaw] = fraction.split('/');
  const numberNoZero = String(parseInt(numRaw, 10));
  const total = parseInt(totalRaw, 10);

  const q = `(${[`number:"${numRaw}"`, `number:"${numberNoZero}"`].join(' OR ')}) (set.total:${total} OR set.printedTotal:${total})`;
  return { q, numberCandidates: [numRaw, numberNoZero], total };
}

export async function searchByFraction(fraction, { pageSize = 50 } = {}) {
  const { q } = buildQueryFromFraction(fraction);

  const url = new URL(BASE);
  url.searchParams.set('q', q);
  url.searchParams.set('orderBy', '-set.releaseDate,number');
  url.searchParams.set('pageSize', String(pageSize));

  const headers = {};
  if (process.env.POKEMON_TCG_API_KEY) {
    headers['X-Api-Key'] = process.env.POKEMON_TCG_API_KEY;
  }

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  const json = await res.json();

  return json.data.map(c => ({
    id: c.id,
    name: c.name,
    number: c.number,
    set: {
      id: c.set?.id,
      name: c.set?.name,
      total: c.set?.total,
      printedTotal: c.set?.printedTotal,
      releaseDate: c.set?.releaseDate
    },
    images: c.images,
    tcgplayer: c.tcgplayer?.url
  }));
}
