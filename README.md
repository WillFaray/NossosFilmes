# ✨ NossosMomentos

Diário compartilhado de **filmes e séries** para **duas pessoas**, com busca integrada ao TMDB, acompanhamento de maratonas em andamento com check-ins rápidos, registro retroativo de temporadas por calendário interativo, métricas de afinidade do casal, lista de interesse com roleta e banco de dados SQLite local.

---

<div align="center">
  <img width="900" alt="Tela principal do app" src="https://github.com/user-attachments/assets/c0456b49-04ab-473b-aff1-a8456376335b" />
</div>

---

## ⚡ Funcionalidades

- **📺 Séries de TV & Maratonas (Híbrido)**:
  - **Assistindo no Momento**: Bloco na home para acompanhar séries em andamento.
  - **Check-in Rápido de Sofá**: Botões de 1 toque (`+1`, `+2`, `+3`, `Até o fim`) que geram badges visuais no Calendário (`S01 • Eps 3-4`).
  - **Registro Retroativo de Temporadas**: Seletor interativo de datas com atalho "Intervalo Início → Fim" para preencher facilmente maratonas passadas.
  - **Fluxo de Conclusão e Abandono**: Avaliação conjunta ao finalizar ou chips de motivo ao abandonar.

- **📖 Diário & Histórico Unificado**:
  - Filtro rápido de tipo: **Todos | Filmes | Séries**.
  - 3 modos de visualização: **Diário** (lista), **Obras** (grade) e **Calendário** (com sessões e episódios).
  - Busca textual por título, filtros por quem indicou, gênero, plataforma, nota mínima e período.
  - Indicador de **Re-watch** e cálculo unificado de **Tempo juntos** (duração de filmes + episódios × duração).

- **✍️ Adicionar Sessão ou Série**:
  - Busca unificada e categorizada via **TMDB API** (Filmes e Séries).
  - Três modos para séries: Concluída, Em Andamento ou Abandonada.
  - Seletor de plataforma (*Cinema, Netflix, Prime Video, Disney+, Max, etc.*).
  - Alerta de re-watch automático.

- **🎲 Lista de Interesse & Roleta**:
  - Watchlist unificada com busca por título e filtros por gênero e tipo (*Todos | Filmes | Séries*).
  - **Roleta da Sorte**: Sorteia filmes ou séries da lista com filtros de duração e gênero, além de auto-remoção opcional após registrar.

- **👥 Perfis & Sintonia da Dupla**:
  - Estatísticas individuais (média, favoritos $\ge$ 4★, decepções $\le$ 2.5★, taxa de acerto de indicações).
  - **Métrica de Afinidade**: % de sintonia nas avaliações.
  - **Quem é o mais crítico?**: comparação direta da média de notas.
  - **Top Filmes** e **Top Séries** da dupla.
  - **Maior Concordância** e **Maior Discordância** (*Discussão de casal*).

- **⚙️ Configurações & Gestão de Dados**:
  - Exportação em **JSON** e backup físico do **SQLite (.db)**.
  - Importação com opção de **Mesclar (Merge)** ou **Substituir (Replace)** (compatível com backups do NossosMomentos e NossosFilmes).
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
