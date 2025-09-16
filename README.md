# Pokémon Card Finder

Busca cartas do Pokémon TCG pelo formato **número/total** (ex.: `032/168`) usando a API v2 do Pokémon TCG.

## Requisitos
- Node.js 18+
- (Opcional) Chave da API do Pokémon TCG: coloque em `POKEMON_TCG_API_KEY` no `.env` para aumentar a cota.

## Instalação
```bash
npm i
cp .env.example .env   # edite e adicione sua chave, se tiver
```

## CLI
```bash
npm run cli -- 032/168
```

## API local + Front simples
```bash
npm run dev
# Acesse: http://localhost:3000
# Endpoint: GET /api/card?fraction=032/168
```
Abra `web/index.html` no navegador **depois** de iniciar o servidor (ele consome `/api/card`).

## Estrutura
```
pokemon-card-finder/
├─ package.json
├─ .env.example
├─ .gitignore
├─ README.md
├─ src/
│  ├─ api.js
│  ├─ cli.js
│  └─ server.js
└─ web/
   └─ index.html
```

## Notas
- A consulta usa `number` com e sem zeros à esquerda e compara `set.total` **ou** `set.printedTotal` com o total informado.
- Alguns cards possuem números alfanuméricos (ex.: `TG01`), este projeto foca no padrão `NNN/TTT`.
