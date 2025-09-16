# 🎴 Pokémon TCG Finder

Um app web para **buscar cartas do Pokémon TCG** por número/coleção, visualizar detalhes, preços e montar sua própria **Want List** — tudo salvo direto no navegador (sem precisar de banco de dados).


---

## ✨ Funcionalidades

- 🔎 **Busca por fração** (ex.: `032/168`, `GG68/GG70`, `SVP-001/30`)
- 📚 **Busca por coleção** — lista sets e permite navegar entre as cartas (API atualmente com problemas)
- ⭐ **Raridade** — dinamicamente via API oficial do TCG
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
