# ♻️ Reviva — Marketplace de Produtos Usados

Reviva é uma aplicação **full stack** de marketplace, onde usuários podem se cadastrar, anunciar produtos, navegar pelo catálogo e conversar diretamente com o vendedor por meio de um chat integrado — tudo dentro da própria plataforma.

O projeto é dividido em duas partes independentes:

- **`back/`** — API REST em Node.js + Express, com PostgreSQL como banco de dados.
- **`front/`** — Interface em React que consome essa API.

<br>

## 🧩 Como o projeto funciona

1. O usuário se cadastra e faz login. O backend gera um **token JWT**, que é entregue em um cookie `httpOnly` (não fica acessível via JavaScript no navegador, o que reduz o risco de roubo do token).
2. Esse cookie é enviado automaticamente em toda requisição ao backend. Um **middleware de autenticação** (`back/auth.js`) verifica esse token antes de liberar o acesso às rotas protegidas — rotas como listar produtos publicamente ficam liberadas mesmo sem login.
3. Usuários autenticados podem cadastrar produtos, editar seu perfil e abrir um **chat** com o vendedor de qualquer produto que não seja seu. As mensagens desse chat ficam salvas no banco e são atualizadas por polling (o frontend busca mensagens novas periodicamente).
4. O backend roda uma **migration automática** ao iniciar (`runMigration`), garantindo que colunas e tabelas novas (telefone, foto, bio, chats, mensagens) sejam criadas mesmo em bancos já existentes, sem precisar rodar scripts SQL manuais toda vez.

<br>

## 🧩 Tecnologias utilizadas

### Frontend (`front/`)
- React
- JavaScript
- CSS

### Backend (`back/`)
- Node.js + Express
- PostgreSQL (via `pg`)
- JWT (`jsonwebtoken`) para autenticação
- Bcrypt para hash de senhas
- express-rate-limit para limitar tentativas de login/cadastro
- Jest + Supertest para testes automatizados

<br>

## 🧩 Funcionalidades

### Autenticação e conta
- Cadastro de usuário com validação de senha (mínimo 8 caracteres, pelo menos uma letra e um número)
- Login com verificação de credenciais e proteção contra *timing attack* (a comparação de senha roda mesmo quando o e-mail não existe)
- Sessão via cookie JWT `httpOnly`, com opção de "lembrar-me" (expiração mais longa)
- Logout (limpa o cookie de sessão)
- Rate limiting nas rotas de `/login` e `/register` para dificultar força bruta

### Perfil
- Visualizar e editar perfil (nome, bio, foto)
- Alterar senha (exige senha atual correta)
- Remover foto de perfil
- Verificação de telefone por código simulado de 6 dígitos, com expiração de 10 minutos

### Marketplace de produtos
- Listar produtos com filtro por categoria e busca por nome
- Listar categorias existentes
- Ver detalhes de um produto específico
- Cadastrar, editar e remover produtos (edição e remoção só pelo dono do produto)
- Filtro para ver "meus produtos"

### Chat entre comprador e vendedor
- Abrir (ou recuperar, se já existir) uma conversa sobre um produto
- Impede que o próprio vendedor abra chat consigo mesmo
- Enviar e listar mensagens de uma conversa
- Listar todas as conversas do usuário, com a última mensagem de cada uma
- Acesso a uma conversa é restrito aos seus dois participantes

<br>

## 🧩 Testes automatizados

O backend tem uma suíte de testes em `back/tests/`, escrita com **Jest** e **Supertest**. O banco de dados é totalmente mockado (`back/__mocks__/db.js`), então os testes não dependem de um PostgreSQL real nem de variáveis de ambiente de produção.

- **`tests/server.test.js`** — testes de integração das rotas HTTP:
  - `GET /health` respondendo conectado/degradado conforme o banco
  - `POST /register`: campos obrigatórios, regras de senha, cadastro bem-sucedido e e-mail duplicado (409)
  - `POST /login`: campos obrigatórios, e-mail inexistente, senha errada e login correto com cookie de sessão
  - Rotas protegidas (`/perfil`, `/produtos`) bloqueando acesso sem autenticação
  - `GET /produtos` funcionando como rota pública

- **`tests/auth.test.js`** — testes unitários do middleware de autenticação:
  - Rotas públicas liberadas sem token
  - Rota protegida bloqueada (401) sem token
  - Token válido libera o acesso e popula `req.usuario`
  - Token inválido bloqueia e limpa o cookie
  - `GET /produtos` decodifica o usuário quando há token válido, mas continua acessível mesmo com token inválido

Para rodar os testes:

```bash
cd back
npm install
npm test
```

<br>

## 🧩 Como executar o projeto

### 🔹 Pré-requisitos
- Node.js instalado
- PostgreSQL instalado e em execução

### 🔹 1. Instale as dependências

```bash
cd back
npm install
```

```bash
cd ../front
npm install
```

### 🔹 2. Configure o banco de dados

Crie o banco:

```sql
CREATE DATABASE "Projeto_LabProg";
```

Conecte-se a ele e execute o script `setup.sql` (na raiz do projeto) para criar as tabelas iniciais.

### 🔹 3. Configure as variáveis de ambiente

Em `back/.env`, ajuste a `DATABASE_URL` com as credenciais do seu PostgreSQL:

```env
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/Projeto_LabProg
JWT_EXPIRES_LEMBRAR=24h
JWT_EXPIRES_SESSAO=2h
PORT=3001
CLIENT_URL=http://localhost:3000
```

### 🔹 4. Execute o projeto

Backend (em um terminal):

```bash
cd back
npm start
```

O servidor sobe em `http://localhost:3001` e roda a migration automática na inicialização.

Frontend (em outro terminal):

```bash
cd front
npm start
```

A aplicação abre em `http://localhost:3000`, já configurada para conversar com o backend na porta 3001.

<br>

## 🧩 Estrutura do projeto

```bash
Reviva-main/
├── back/
│   ├── server.js         # rotas da API e inicialização do servidor
│   ├── auth.js           # middleware de autenticação (JWT)
│   ├── db.js             # pool de conexão com o PostgreSQL
│   ├── config.js         # variáveis de configuração
│   ├── __mocks__/db.js   # mock do banco usado nos testes
│   └── tests/            # testes automatizados (Jest + Supertest)
│
├── front/
│   └── src/
│       ├── api.js
│       ├── AppLayout.js         # layout principal, feed de produtos e chat
│       ├── PrivateRoute.js
│       └── componentes/
│           ├── Login/           # login, cadastro e tela de boas-vindas
│           ├── Perfil/          # perfil do usuário e do vendedor
│           └── Produtos/        # listagem/cadastro de produtos
│
├── setup.sql       # script inicial de criação das tabelas
├── migration.sql   # ajustes incrementais no schema
└── README.md
```

<br>

## 🧩 Segurança

- Senhas armazenadas com hash **Bcrypt** (custo 12)
- Comparação de senha resistente a *timing attack* mesmo quando o e-mail não existe
- Sessão via **JWT** em cookie `httpOnly`, invalidado (`clearCookie`) sempre que o token é inválido ou expirado
- Rate limiting nas rotas de autenticação
- Verificação de propriedade antes de editar/remover produtos ou acessar um chat
