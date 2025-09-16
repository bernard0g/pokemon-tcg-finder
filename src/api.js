import 'dotenv/config';
import fetch from 'node-fetch';

const BASE = 'https://api.pokemontcg.io/v2/cards';
const DEFAULT_TIMEOUT_MS = 10000; // 10s

function buildQueryFromFraction(fraction) {
  const [numRaw, totalRaw] = fraction.split('/');
  const numberNoZero = String(parseInt(numRaw, 10));
  const total = parseInt(totalRaw, 10);
  const q = `(${[`number:"${numRaw}"`, `number:"${numberNoZero}"`].join(' OR ')}) (set.total:${total} OR set.printedTotal:${total})`;
  return { q };
}

async function fetchWithTimeout(url, opts = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Timeout após ${timeoutMs / 1000}s consultando a API do Pokémon TCG`);
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}

export async function searchByFraction(fraction, { pageSize = 40 } = {}) {
  const { q } = buildQueryFromFraction(fraction);

  const url = new URL(BASE);
  url.searchParams.set('q', q);
  url.searchParams.set('orderBy', '-set.releaseDate,number');
  url.searchParams.set('pageSize', String(pageSize));

  const headers = {};
  if (process.env.POKEMON_TCG_API_KEY) headers['X-Api-Key'] = process.env.POKEMON_TCG_API_KEY;

  const res = await fetchWithTimeout(url.toString(), { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}${text ? `: ${text}` : ''}`);
  }
  const json = await res.json();

  // Expandido para o modal de detalhes
  return (json.data ?? []).map(c => ({
    id: c.id,
    name: c.name,
    number: c.number,
    supertype: c.supertype,
    subtypes: c.subtypes,
    types: c.types,
    rarity: c.rarity,
    artist: c.artist,
    flavorText: c.flavorText,
    nationalPokedexNumbers: c.nationalPokedexNumbers,
    set: {
      id: c.set?.id,
      name: c.set?.name,
      series: c.set?.series,
      total: c.set?.total,
      printedTotal: c.set?.printedTotal,
      releaseDate: c.set?.releaseDate
    },
    images: c.images,
    tcgplayer: c.tcgplayer?.url
  }));
}
