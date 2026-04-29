-- ─────────────────────────────────────────────────────────────
--  StoreApp — Setup do Banco de Dados PostgreSQL (v2)
-- ─────────────────────────────────────────────────────────────

-- 1. Crie o banco (rode fora do psql ou no pgAdmin):
-- CREATE DATABASE "Projeto_LabProg";

-- 2. Conecte ao banco e execute este script:

-- Tabela de usuários (com telefone, foto e bio)
CREATE TABLE IF NOT EXISTS usuarios (
  id                  SERIAL PRIMARY KEY,
  nome                VARCHAR(120)        NOT NULL,
  email               VARCHAR(180) UNIQUE NOT NULL,
  senha               TEXT                NOT NULL,
  telefone            VARCHAR(20)         DEFAULT '',
  telefone_verificado BOOLEAN             DEFAULT FALSE,
  telefone_codigo     VARCHAR(6)          DEFAULT NULL,
  telefone_codigo_exp TIMESTAMP           DEFAULT NULL,
  foto_url            TEXT                DEFAULT '',
  bio                 TEXT                DEFAULT '',
  criado_em           TIMESTAMP           DEFAULT NOW()
);

-- Tabela de produtos (com usuario_id para saber quem é o vendedor)
CREATE TABLE IF NOT EXISTS produtos (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER       REFERENCES usuarios(id) ON DELETE CASCADE,
  nome        VARCHAR(200)  NOT NULL,
  descricao   TEXT          DEFAULT '',
  preco       NUMERIC(12,2) NOT NULL DEFAULT 0,
  estoque     INTEGER       NOT NULL DEFAULT 0,
  categoria   VARCHAR(80)   NOT NULL,
  imagem_url  TEXT          DEFAULT '',
  criado_em   TIMESTAMP     DEFAULT NOW()
);
