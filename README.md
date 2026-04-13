# 🧾 CRUD com Autenticação (React + Node.js + PostgreSQL)
---

## 📌 Descrição

Este projeto é uma aplicação **full stack** que implementa um sistema de **CRUD (Create, Read, Update, Delete)** com autenticação de usuários.

Inicialmente desenvolvido com persistência em arquivo JSON, o sistema foi evoluído para utilizar um **banco de dados relacional PostgreSQL**, proporcionando maior escalabilidade e confiabilidade.

A autenticação é realizada por meio de **JSON Web Tokens (JWT)**, garantindo segurança no controle de acesso às rotas protegidas.

Após o login bem-sucedido, o usuário é redirecionado automaticamente para a **tela inicial da aplicação**, que se encontra em desenvolvimento.

---

## 🔹 Tecnologias Utilizadas

### Frontend

* React
* JavaScript
* CSS

### Backend

* Node.js
* Express
* JWT (JSON Web Token)
* Bcrypt

### Banco de Dados

* PostgreSQL

---

##🔹 Funcionalidades

*  Cadastro de usuários
*  Login com validação de credenciais
*  Autenticação via **token JWT**
*  Criptografia de senhas com Bcrypt
*  Redirecionamento automático após login
*  Operações CRUD completas
*  Integração com banco de dados PostgreSQL
* ⚠️ Tela inicial em desenvolvimento

---

##🔹 Estrutura do Projeto

```bash
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   ├── models/
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│
├── .gitignore
├── README.md
```

---

## ⚙️ Como Executar o Projeto

### 🔹 Pré-requisitos

* Node.js instalado
* PostgreSQL instalado e configurado

---

### 🔹 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/seu-repositorio.git
```

---

### 🔹 2. Acesse as pastas

```bash
cd backend
npm install
```

```bash
cd ../frontend
npm install
```

---

### 🔹 3. Configure o banco de dados

Crie um banco no PostgreSQL e configure as credenciais no arquivo `.env` do backend:


---

### 🔹 4. Execute o projeto

#### Backend

```bash
npm start
```

#### Frontend

```bash
npm start
```

---

## 🛡️Segurança

* Senhas armazenadas com hash usando **Bcrypt**
* Autenticação baseada em **JWT**
* Proteção de rotas no backend

