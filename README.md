# 🎬 Sala de Cinema — Nossos Filmes em Dupla

> **Nome criativo:** Sala de Cinema (ou "NossosFilmes" como apelido do projeto)

Um diário de filmes compartilhado para **duas pessoas**, com visual cinematográfico premium — como uma sala de cinema aconchegante dentro do navegador.

---

## ✨ Sobre o Projeto

**Sala de Cinema** é um app feito para casais, amigos ou qualquer dupla que queira registrar e avaliar os filmes que assistem juntos. Ele transforma a experiência de acompanhar a filmografia da dupla em algo visual, elegante e divertido.

### Proposta e Design

- **Tema "Cinematic Dark"**: fundo preto profundo com vinheta suave, glassmorphism nas barras de navegação, cards e modais.
- **Destaque dourado**: estrelas de avaliação e os elementos de destaque usam um tom dourado suave; os CTA principais usam um índigo/roxo sutil.
- **Animações suaves**: modais surgem com fade + scale vindos do centro, posteres têm hover elegante com sombra profunda, e a Roleta tem animações dramáticas ao girar e revelar o vencedor.
- **Tipografia limpa**: Inter, com total destaque para as capas dos filmes — a estrela do app.

> [INSERIR SCREENSHOT DA HOME]

> [INSERIR SCREENSHOT DA ROULETTE]

---

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| **Next.js 14 (App Router)** | Framework principal, Server Components + Actions |
| **TypeScript** | Tipagem em todo o projeto |
| **Tailwind CSS** | Estilização utilitária com dark mode |
| **Framer Motion** | Animações e transições de UI |
| **Prisma + SQLite** | Banco de dados local persistente |
| **TMDB API** | Busca de filmes, pôsteres e sinopses |

---

## 📦 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/WillFaray/NossosFilmes.git
cd NossosFilmes
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz:

```env
NEXT_PUBLIC_TMDB_API_KEY=SUA_CHAVE_TMDB
```

> Obtenha uma chave gratuita em [themoviedb.org](https://www.themoviedb.org/settings/api).

### 4. Configure o banco de dados

```bash
npx prisma generate
npx prisma db push
```

Isso cria o arquivo `dev.db` (SQLite) e as tabelas `User`, `MovieReview` e `WatchlistItem`.

### 5. Rode o app

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

---

## 🚀 Como usar

1. **Primeiro acesso**: o app exibe automaticamente a tela de **Onboarding** — configure os dois perfis (nome + foto opcional).
2. **Adicionar Registro**: busque um filme no TMDB, preencha data assistida, notas de ambos e quem indicou.
3. **Histórico**: visualize os filmes em 3 modos — Diário (lista), Filmes (grid de pôsteres) e Calendário.
4. **Lista de Interesse**: adicione filmes para assistir depois e use a **Roleta** para decidir o que ver hoje.
5. **Perfis**: veja estatísticas individuais (favoritos, decepções, taxa de acerto) e edite nome/foto.

---

## 🌍 English

### About

**Sala de Cinema** (working title: *NossosFilmes*) is a shared movie diary for **two people**, with a premium cinematic visual design — a cozy home theater inside the browser.

It lets a couple or a duo log and rate the movies they watch together, turning the experience into something visual, elegant and fun.

### Tech Stack

- **Next.js 14 (App Router)** + **TypeScript**
- **Tailwind CSS** (dark mode)
- **Framer Motion** (UI animations)
- **Prisma + SQLite** (local database)
- **TMDB API** (movie search, posters & synopses)

### Setup

```bash
git clone https://github.com/WillFaray/NossosFilmes.git
cd NossosFilmes
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_TMDB_API_KEY=YOUR_TMDB_KEY
```

Get a free API key at [themoviedb.org](https://www.themoviedb.org/settings/api).

```bash
npx prisma generate
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### How it works

1. **First run**: the app automatically shows the **Onboarding** screen — set up both profiles (name + optional photo).
2. **Add Entry**: search a movie on TMDB, fill in watched date, both ratings and who recommended it.
3. **History**: browse movies in 3 views — Diary (list), Films (poster grid) and Calendar.
4. **Watchlist**: add movies for later and use the **Roulette** to decide what to watch today.
5. **Profiles**: see individual stats (favorites, disappointments, hit rate) and edit name/photo.

---

## 📝 Licença

MIT