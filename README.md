# 🎬 Nossos Filmes

Diário de filmes compartilhado para **duas pessoas**, com busca integrada ao TMDB, métricas de afinidade do casal, lista de interesse com roleta e banco de dados SQLite local.

---

<div align="center">
  <img width="900" alt="Tela principal do app" src="https://github.com/user-attachments/assets/c0456b49-04ab-473b-aff1-a8456376335b" />
</div>

---

## ⚡ Funcionalidades

- **📖 Diário & Histórico**:
  - 3 modos de visualização: **Diário** (lista), **Filmes** (grade) e **Calendário**.
  - Busca textual por título, filtros por quem indicou, gênero, nota média e período.
  - Indicador de **Re-watch** (múltiplas sessões do mesmo filme) e somatório de **Horas assistidas juntas**.

- **✍️ Adicionar Sessão**:
  - Busca em tempo real via **TMDB API** (título, pôster, sinopse, gênero e duração).
  - Seletor de plataforma (*Cinema, Netflix, Prime Video, Disney+, etc.*).
  - Alerta de re-watch quando o filme já foi assistido anteriormente.
  - Pré-preenchimento automático via URL (`/adicionar?tmdbId=...`).

- **🎲 Lista de Interesse & Roleta**:
  - Watchlist com busca interna por título e filtro por gênero.
  - **Roleta de filmes** com filtro opcional por gênero e botão direto *"Registrar sessão"*.

- **👥 Perfis & Sintonia da Dupla**:
  - Estatísticas individuais (média, favoritos $\ge$ 4★, decepções $\le$ 2.5★, taxa de acerto de quem indicou).
  - **Métrica de Afinidade**: % de sintonia nas avaliações.
  - **Quem é o mais crítico?**: comparação direta da média de notas.
  - **Maior Concordância** e **Maior Discordância** (*Discussão de casal*).
  - **Gêneros Favoritos** por pessoa com ranking e barras de progresso.

- **⚙️ Configurações & Gestão de Dados**:
  - Exportação em **JSON** e backup físico do **SQLite (.db)**.
  - Importação com opção de **Mesclar (Merge)** ou **Substituir (Replace)**.
  - Edição dos perfis diretamente pelo painel e reset seguro de fábrica.

---

## 🛠️ Tecnologias

- **Next.js 14** (App Router, Server Components & Server Actions)
- **TypeScript** & **Tailwind CSS**
- **Framer Motion** & **Lucide Icons**
- **Prisma** & **SQLite** (`better-sqlite3`)
- **Bun** (Gerenciador de pacotes & runtime)
- **TMDB API**

---

## Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/WillFaray/NossosFilmes.git
cd NossosFilmes
```

### 2. Instale as dependências
```bash
bun install
# ou: npm install
```

### 3. Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto (use o `.env.example` como base):

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_TMDB_API_KEY=sua_chave_tmdb_aqui
```

> Obtenha uma chave gratuita da API em [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api).

### 4. Inicialize o banco de dados
```bash
bun run db:migrate
bun run db:generate
```

### 5. Inicie o servidor
```bash
bun run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## 📄 Licença

MIT
