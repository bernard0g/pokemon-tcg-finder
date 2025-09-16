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

// ========== resiliencia ==========
const MAX_RETRIES = parseInt(process.env.POKEMON_TCG_MAX_RETRIES || '2', 10); // total de novas tentativas além da 1ª
const BASE_TIMEOUT_MS = parseInt(process.env.POKEMON_TCG_TIMEOUT_MS || '20000', 10); // 20s por tentativa
const SMALL_PAGE = parseInt(process.env.POKEMON_TCG_PAGE_SIZE || '24', 10); // menor pra responder mais rápido

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function requestWithRetry(url, opts = {}, { timeoutMs = BASE_TIMEOUT_MS, retries = MAX_RETRIES } = {}) {
  let attempt = 0;
  let lastErr;
  while (attempt <= retries) {
    try {
      const res = await fetchWithTimeout(url, opts, timeoutMs);
      if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text().catch(()=> '')}`);
      return res;
    } catch (e) {
      lastErr = e;
      const transient = (e.name === 'AbortError') || /Timeout/i.test(e.message) || /API error 5\d\d/.test(e.message);
      if (!transient || attempt === retries) break;
      // backoff exponencial simples: 500ms, 1000ms, 2000ms...
      await sleep(500 * Math.pow(2, attempt));
      attempt += 1;
      // a cada tentativa, da um pouco mais de folga de timeout
      timeoutMs = Math.min(timeoutMs + 5000, 30000);
    }
  }
  throw lastErr;
}

// ===== busca por fração NNN/TTT =====
// Aceita: "032/168", "32/168", "Mew ex (205/165)", "Charizard 4/102",
//         "GG68/70", "SVP-001/30", etc.
function buildFractionQuery(input) {
  const str = String(input || '');

  // pega a PRIMEIRA ocorrência tipo [letras/hífen]*dígitos / [letras/hífen]*dígitos
  const m = str.match(/([A-Za-z-]*\d+)\s*\/\s*([A-Za-z-]*\d+)/i);
  if (!m) {
    const err = new Error('INVALID_FRACTION: use NNN/TTT (ex.: 032/168 ou Mew ex (205/165) ou GG68/70)');
    err.code = 'INVALID_FRACTION';
    throw err;
  }

  const numberRaw = m[1];               // ex.: "032" | "GG68" | "SVP-001"
  const totalRaw  = m[2];               // ex.: "168" | "GG70" | "30"

  // candidatos para 'number': o texto bruto e a versão "só dígitos" sem zeros à esquerda
  const numberDigits = (numberRaw.match(/\d+/) || [''])[0];
  const numberNoZero = numberDigits ? String(parseInt(numberDigits, 10)) : null;

  // total do set SEM letras (impresso é sempre número)
  const totalDigits = (totalRaw.match(/\d+/) || [''])[0];
  const total = parseInt(totalDigits, 10);

  const numberCandidates = [numberRaw, numberNoZero].filter(Boolean)
    .map(s => `number:"${s}"`).join(' OR ');

  // Query:
  // (number:"GG68" OR number:"68") (set.total:70 OR set.printedTotal:70)
  return `(${numberCandidates}) (set.total:${total} OR set.printedTotal:${total})`;
}
export async function searchByFraction(fraction, { pageSize = SMALL_PAGE } = {}) {
  const url = new URL(CARDS);
  url.searchParams.set('q', buildFractionQuery(fraction));
  url.searchParams.set('orderBy', '-set.releaseDate,number');
  url.searchParams.set('pageSize', String(pageSize));
  url.searchParams.set('select', 'id,name,number,rarity,supertype,subtypes,types,artist,flavorText,nationalPokedexNumbers,set,images,tcgplayer');

  const res = await requestWithRetry(url.toString(), { headers: authHeaders() });
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

    const res = await requestWithRetry(url.toString(), { headers: authHeaders() });
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
    const res = await requestWithRetry(url.toString(), { headers: authHeaders() });
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

  const res = await requestWithRetry(url.toString(), { headers: authHeaders() });
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

// ===== rarities =====
export async function getRarities() {
  const url = new URL('https://api.pokemontcg.io/v2/rarities');
  const res = await requestWithRetry(url.toString(), { headers: authHeaders() });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text().catch(()=> '')}`);
  const json = await res.json();
  // resposta vem tipo { data: ["Common","Uncommon", ...] }
  return Array.isArray(json.data) ? json.data : [];
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
