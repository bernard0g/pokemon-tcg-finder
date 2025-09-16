import 'dotenv/config';
import fetch from 'node-fetch';

const CARDS = 'https://api.pokemontcg.io/v2/cards';
const SETS  = 'https://api.pokemontcg.io/v2/sets';
const DEFAULT_TIMEOUT_MS = 10000;

// ===== utils =====
async function fetchWithTimeout(url, opts = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`Timeout após ${timeoutMs/1000}s consultando a API do Pokémon TCG`);
    throw err;
  } finally {
    clearTimeout(t);
  }
}
function authHeaders() {
  const h = {};
  if (process.env.POKEMON_TCG_API_KEY) h['X-Api-Key'] = process.env.POKEMON_TCG_API_KEY;
  return h;
}

// ===== busca por fração NNN/TTT =====
function buildFractionQuery(input) {
  // Aceita: "032/168", "32/168", "Mew ex (205/165)", "Charizard 4/102", etc.
  // Extrai a primeira ocorrência de NNN/TTT
  const m = String(input).match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) {
    // usar um prefixo para o server devolver 400 amigável
    const err = new Error('INVALID_FRACTION: informe no formato NNN/TTT (ex.: 032/168 ou Mew ex (205/165))');
    err.code = 'INVALID_FRACTION';
    throw err;
  }
  const numRaw = m[1];                  // "032" ou "205"
  const numberNoZero = String(parseInt(numRaw, 10)); // "32" ou "205"
  const total = parseInt(m[2], 10);     // 168
  // Query robusta: aceita number com/sem zero e total impresso ou total
  return `(${[`number:"${numRaw}"`, `number:"${numberNoZero}"`].join(' OR ')}) (set.total:${total} OR set.printedTotal:${total})`;
}
export async function searchByFraction(fraction, { pageSize = 40 } = {}) {
  const url = new URL(CARDS);
  url.searchParams.set('q', buildFractionQuery(fraction));
  url.searchParams.set('orderBy', '-set.releaseDate,number');
  url.searchParams.set('pageSize', String(pageSize));

  const res = await fetchWithTimeout(url.toString(), { headers: authHeaders() });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text().catch(()=> '')}`);
  const json = await res.json();
  return (json.data ?? []).map(mapCard);
}

// ===== busca de sets (coleções) =====
export async function searchSetsByName(name, { pageSize = 25 } = {}) {
  const esc = String(name).replaceAll('"', '\\"').trim();
  if (!esc) {
    return { data: [], totalCount: 0 };
  }

  // 1) tentativa padrão – /v2/sets
  try {
    const url = new URL(SETS);
    url.searchParams.set('q', `name:"${esc}"*`);
    url.searchParams.set('orderBy', '-releaseDate');
    url.searchParams.set('pageSize', String(pageSize));

    const res = await fetchWithTimeout(url.toString(), { headers: authHeaders() });
    if (!res.ok) throw new Error(`SETS_${res.status}`);
    const json = await res.json();
    return {
      data: (json.data ?? []).map(s => ({
        id: s.id,
        name: s.name,
        series: s.series,
        printedTotal: s.printedTotal,
        total: s.total,
        releaseDate: s.releaseDate,
        images: s.images
      })),
      totalCount: json.totalCount ?? (json.data?.length || 0)
    };
  } catch (_e) {
    // 2) FALLBACK — buscar por cards e agregar set.*
    const url = new URL(CARDS);
    url.searchParams.set('q', `set.name:"${esc}"*`);
    url.searchParams.set('orderBy', '-set.releaseDate');
    url.searchParams.set('pageSize', '250'); // pegar bastante e deduplicar
    const res = await fetchWithTimeout(url.toString(), { headers: authHeaders() });
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text().catch(()=> '')}`);
    const json = await res.json();

    // agrega por set.id
    const byId = new Map();
    for (const c of (json.data ?? [])) {
      const s = c.set || {};
      if (!s.id) continue;
      if (!byId.has(s.id)) {
        byId.set(s.id, {
          id: s.id,
          name: s.name,
          series: s.series,
          printedTotal: s.printedTotal,
          total: s.total,
          releaseDate: s.releaseDate,
          images: s.images
        });
      }
    }
    const list = Array.from(byId.values());
    // ordena por data (desc)
    list.sort((a,b)=> String(b.releaseDate||'').localeCompare(String(a.releaseDate||'')));
    return { data: list.slice(0, pageSize), totalCount: list.length };
  }
}


// ===== cards por set + raridades + paginação =====
export async function searchCardsBySet({ setId, rarities = [], page = 1, pageSize = 60 }) {
  if (!setId) throw new Error('setId é obrigatório');
  const url = new URL(CARDS);

  // q: set.id:"xxx" AND (rarity:"Rare" OR rarity:"Ultra Rare")
  const parts = [`set.id:"${setId}"`];
  if (Array.isArray(rarities) && rarities.length) {
    const or = rarities.map(r => `rarity:"${r}"`).join(' OR ');
    parts.push(`(${or})`);
  }
  url.searchParams.set('q', parts.join(' '));
  url.searchParams.set('orderBy', 'number'); // dentro do set, ordenar por número
  url.searchParams.set('page', String(page));
  url.searchParams.set('pageSize', String(pageSize));

  const res = await fetchWithTimeout(url.toString(), { headers: authHeaders() });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text().catch(()=> '')}`);
  const json = await res.json();
  return {
    data: (json.data ?? []).map(mapCard),
    page,
    pageSize,
    count: json.count ?? (json.data?.length || 0),
    totalCount: json.totalCount ?? (json.data?.length || 0)
  };
}

// ===== mapeamento de card para o front =====
function mapCard(c) {
  return {
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
  };
}
