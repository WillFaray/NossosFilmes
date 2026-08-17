# 🎬 Nossos Filmes

Um diário de filmes compartilhado para **duas pessoas**, com visual intuitivo, API acessíveis e interface web.

---

## Sobre o Projeto

**Nossos Filmes** é um app feito para casais, amigos ou qualquer dupla que queira registrar e avaliar os filmes que assistem juntos. Ele transforma a experiência de acompanhar a filmografia da dupla em algo visual, elegante e divertido.

### Proposta e Design      
- Experiência Imersiva: Uma paleta de cores profunda e minimalista, projetada para conforto visual e para simular a estética de uma sessão de cinema.
- Navegação Intuitiva: Uso estratégico de contrastes e elementos de profundidade para criar uma hierarquia clara, destacando as ações principais sem poluir a interface.
- Interações Fluidas: Transições responsivas e dinâmicas que tornam o uso do aplicativo mais orgânico, elevando a experiência em recursos como a seleção aleatória de filmes.
- Foco no Conteúdo: Tipografia limpa e estrutura visual pensadas com um único objetivo: dar destaque absoluto aos posteres e às informações das obras.

<img width="1903" height="919" alt="Tela principal do app" src="https://github.com/user-attachments/assets/c0456b49-04ab-473b-aff1-a8456376335b" />

<img width="1920" height="887" alt="Roleta de filmes na lista de interesses" src="https://github.com/user-attachments/assets/0d353f54-1b48-4350-b61b-a08bb9ebf568" />

---

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| **Next.js 14** | Framework principal, Server Components + Actions |
| **TypeScript** | Tipagem em todo o projeto |
| **Tailwind CSS** | Arquitetura visual e estruturação do design system da aplicação |
| **Framer Motion** | Animações e transições de UI |
| **Prisma + SQLite** | Banco de dados local persistente |
| **TMDB API** | Busca de filmes, pôsteres e sinopses |

---

## Instalação

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

## Como usar

1. **Primeiro acesso**: o app exibe automaticamente a tela de **Onboarding** — configure os dois perfis (nome + foto opcional).
2. **Adicionar Registro**: busque um filme no TMDB, preencha data assistida, notas de ambos e quem indicou.
3. **Histórico**: visualize os filmes em 3 modos — Diário (lista), Filmes (grid de pôsteres) e Calendário.
4. **Lista de Interesse**: adicione filmes para assistir depois e use a **Roleta** para decidir o que ver hoje.
5. **Perfis**: veja estatísticas individuais (favoritos, decepções, taxa de acerto) e edite nome/foto.

---

## 📝 Licença

MIT
