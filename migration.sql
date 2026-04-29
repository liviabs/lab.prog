-- ─────────────────────────────────────────────────────────────
--  StoreApp — MIGRATION (rode se já tinha o banco antes)
--  Execute no psql conectado ao banco "Projeto_LabProg"
-- ─────────────────────────────────────────────────────────────

-- Adiciona colunas novas em usuarios (ignora se já existirem)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone            VARCHAR(20)  DEFAULT '';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone_verificado BOOLEAN      DEFAULT FALSE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone_codigo     VARCHAR(6)   DEFAULT NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone_codigo_exp TIMESTAMP    DEFAULT NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url            TEXT         DEFAULT '';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bio                 TEXT         DEFAULT '';

-- Adiciona usuario_id em produtos (ignora se já existir)
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE;
