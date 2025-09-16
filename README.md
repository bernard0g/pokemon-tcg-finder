# 🎴 Pokémon TCG Finder

Um app web para **buscar cartas do Pokémon TCG** por número/coleção, visualizar detalhes, preços e montar sua própria **Want List** — tudo salvo direto no navegador (sem precisar de banco de dados).

---

## ✨ Funcionalidades

- 🔎 **Busca por fração** (ex.: `032/168`, `GG68/70`, `SVP-001/30`)
- 📚 **Busca por coleção** — lista sets e permite navegar entre as cartas (Busca quebrada devido problema com a API)
- ⭐ **Filtro por raridade** — dinamicamente via API oficial do TCG
- 💰 **Preço** — abre links para TCGPlayer e Liga Pokémon Brasil
- 📌 **Want List (Lista de Procura)**
  - Adicionar/remover cartas rapidamente
  - Exportar/Importar em JSON
  - Salvo automaticamente no navegador
- 🖼️ **Detalhes da carta**
  - Imagem em alta qualidade
  - Nome, coleção, raridade, artista, texto e stats
- 🎨 **UI estilizada** — Dark Mode, botões coloridos, animações suaves
- 📱 **Responsivo** — funciona bem no desktop e mobile

---

## 🚀 Tecnologias

- **Frontend**: HTML, CSS (Tailwind-like classes), JavaScript Vanilla
- **Backend**: Node.js + Express
- **API Externa**: [Pokémon TCG API v2](https://docs.pokemontcg.io/)

---

## 📦 Instalação

Clone o repositório e instale as dependências:

```bash
git clone https://github.com/bernard0g/pokemon-tcg-finder.git
cd pokemon-tcg-finder
npm install
```

---

## ▶️ Uso

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Abra no navegador:

```
http://localhost:3000
```

---

## ⚙️ Configurações

Você pode configurar variáveis no `.env` para melhorar a experiência:

```env
POKEMON_TCG_API_KEY=SEU_TOKEN_AQUI
POKEMON_TCG_TIMEOUT_MS=20000
POKEMON_TCG_MAX_RETRIES=2
POKEMON_TCG_PAGE_SIZE=24
```

---

## 📂 Estrutura do Projeto

```
├── src/
│   ├── api.js        # funções de integração com a API do TCG
│   ├── server.js     # servidor Express (rotas /api/card, /api/sets, /api/rarities, ...)
│   └── cli.js        # utilitário CLI (opcional)
├── web/
│   └── index.html    # interface do usuário
├── package.json
└── README.md
```

---

## 🛠️ Melhorias Futuras

- 🔐 Autenticação de usuário (para salvar listas em nuvem)
- 📊 Comparação de preços entre múltiplas lojas
- 📱 Versão PWA (instalável no celular)

---

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch (`git checkout -b minha-feature`)
3. Commit suas alterações (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin minha-feature`)
5. Abra um Pull Request 🚀

---

## 🙏 Créditos

- [Pokémon TCG API](https://pokemontcg.io)
- [Liga Pokémon](https://www.ligapokemon.com.br/)
- Ícones e estilo inspirados em TailwindCSS + shadcn/ui

---
