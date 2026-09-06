require("dotenv").config();

const express      = require("express");
const cors         = require("cors");
const bcrypt       = require("bcrypt");
const jwt          = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const rateLimit    = require("express-rate-limit");

const config    = require("./config");
const db        = require("./db");
const autenticar = require("./auth");

const app = express();

// ── Middlewares globais ───────────────────────────────────────
app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      config.CLIENT_URL,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Bloqueado pelo CORS"));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ── Rate limiting ─────────────────────────────────────────────
const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { mensagem: "Muitas tentativas. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/login", limiterAuth);
app.use("/register", limiterAuth);

// ── Health Check ──────────────────────────────────────────────
app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok", banco: "conectado", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: "degradado", banco: "desconectado", erro: err.message });
  }
});

// ── Autenticação middleware ────────────────────────────────────
app.use(autenticar);

// ── Helpers ───────────────────────────────────────────────────
function gerarCookie(res, token, lembrar) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: lembrar ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000,
  });
}

function validarSenha(senha) {
  if (senha.length < 8)        return "A senha deve ter no mínimo 8 caracteres.";
  if (!/[a-zA-Z]/.test(senha)) return "A senha deve conter ao menos uma letra.";
  if (!/[0-9]/.test(senha))    return "A senha deve conter ao menos um número.";
  return null;
}

function gerarCodigo6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── REGISTER ──────────────────────────────────────────────────
app.post("/register", async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha)
    return res.status(400).json({ mensagem: "Preencha todos os campos!" });

  const erroSenha = validarSenha(senha);
  if (erroSenha) return res.status(400).json({ mensagem: erroSenha });

  try {
    const hash = await bcrypt.hash(senha, 12);
    await db.query(
      "INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3)",
      [nome, email, hash]
    );
    res.status(201).json({ mensagem: "Usuário cadastrado com sucesso!" });
  } catch (err) {
    if (err.code === "23505")
      return res.status(409).json({ mensagem: "E-mail já cadastrado!" });
    console.error("Erro no register:", err.message);
    res.status(500).json({ mensagem: "Erro ao cadastrar usuário." });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────
app.post("/login", async (req, res) => {
  const { email, senha, lembrar } = req.body;
  if (!email || !senha)
    return res.status(400).json({ mensagem: "Preencha todos os campos!" });

  try {
    const result  = await db.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    const usuario = result.rows[0];
    const senhaFalsa = "$2b$12$invalido.hash.para.evitar.timing.attack.xxxxx";
    const ok = await bcrypt.compare(senha, usuario ? usuario.senha : senhaFalsa);

    if (!usuario || !ok)
      return res.status(401).json({ mensagem: "E-mail ou senha inválidos." });

    const expiracao = lembrar ? config.JWT_EXPIRES_LEMBRAR : config.JWT_EXPIRES_SESSAO;
    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email },
      config.JWT_SECRET,
      { expiresIn: expiracao }
    );
    gerarCookie(res, token, lembrar);
    res.json({ mensagem: "Login realizado com sucesso!" });
  } catch (err) {
    console.error("Erro no login:", err.message);
    res.status(500).json({ mensagem: "Erro no servidor." });
  }
});

// ── VERIFICAR SESSÃO ──────────────────────────────────────────
app.get("/verificar", async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ logado: false, usuario: null });
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);

    const r = await db.query(
      "SELECT foto_url FROM usuarios WHERE id = $1",
      [decoded.id]
    );
    const foto_url = r.rows[0]?.foto_url || "";

    res.json({ logado: true, usuario: { ...decoded, foto_url } });
  } catch {
    res.clearCookie("token");
    res.json({ logado: false, usuario: null });
  }
});

// ── HOME ──────────────────────────────────────────────────────
app.get("/home", (req, res) => {
  res.json({ mensagem: "Acesso permitido!", usuario: req.usuario });
});

// ── LOGOUT ────────────────────────────────────────────────────
app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ mensagem: "Logout realizado!" });
});

// ── PERFIL — GET ──────────────────────────────────────────────
app.get("/perfil", async (req, res) => {
  if (!req.usuario) return res.status(401).json({ mensagem: "Não autenticado." });
  try {
    const r = await db.query(
      "SELECT id, nome, email, telefone, telefone_verificado, foto_url, bio, criado_em FROM usuarios WHERE id = $1",
      [req.usuario.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ mensagem: "Usuário não encontrado." });
    res.json({ perfil: r.rows[0] });
  } catch (err) {
    console.error("Erro ao buscar perfil:", err.message);
    res.status(500).json({ mensagem: "Erro ao buscar perfil." });
  }
});

// ── PERFIL — ATUALIZAR (nome, bio, foto_url) ──────────────────
app.put("/perfil", async (req, res) => {
  if (!req.usuario) return res.status(401).json({ mensagem: "Não autenticado." });
  const { nome, bio, foto_url } = req.body;
  if (!nome || !nome.trim())
    return res.status(400).json({ mensagem: "Nome é obrigatório." });
  try {
    const r = await db.query(
      "UPDATE usuarios SET nome=$1, bio=$2, foto_url=$3 WHERE id=$4 RETURNING id, nome, email, telefone, telefone_verificado, foto_url, bio",
      [nome.trim(), bio || "", foto_url || "", req.usuario.id]
    );
    res.json({ mensagem: "Perfil atualizado!", perfil: r.rows[0] });
  } catch (err) {
    console.error("Erro ao atualizar perfil:", err.message);
    res.status(500).json({ mensagem: "Erro ao atualizar perfil." });
  }
});

// ── ALTERAR SENHA ─────────────────────────────────────────────
app.put("/perfil/senha", async (req, res) => {
  if (!req.usuario) return res.status(401).json({ mensagem: "Não autenticado." });
  const { senha_atual, nova_senha } = req.body;
  if (!senha_atual || !nova_senha)
    return res.status(400).json({ mensagem: "Preencha todos os campos." });

  const erroSenha = validarSenha(nova_senha);
  if (erroSenha) return res.status(400).json({ mensagem: erroSenha });

  try {
    const r = await db.query("SELECT senha FROM usuarios WHERE id = $1", [req.usuario.id]);
    if (r.rows.length === 0) return res.status(404).json({ mensagem: "Usuário não encontrado." });

    const ok = await bcrypt.compare(senha_atual, r.rows[0].senha);
    if (!ok) return res.status(401).json({ mensagem: "Senha atual incorreta." });

    const hash = await bcrypt.hash(nova_senha, 12);
    await db.query("UPDATE usuarios SET senha=$1 WHERE id=$2", [hash, req.usuario.id]);
    res.json({ mensagem: "Senha alterada com sucesso!" });
  } catch (err) {
    console.error("Erro ao alterar senha:", err.message);
    res.status(500).json({ mensagem: "Erro ao alterar senha." });
  }
});

// ── REMOVER FOTO ──────────────────────────────────────────────
app.delete("/perfil/foto", async (req, res) => {
  if (!req.usuario) return res.status(401).json({ mensagem: "Não autenticado." });
  try {
    await db.query("UPDATE usuarios SET foto_url='' WHERE id=$1", [req.usuario.id]);
    res.json({ mensagem: "Foto removida com sucesso." });
  } catch (err) {
    console.error("Erro ao remover foto:", err.message);
    res.status(500).json({ mensagem: "Erro ao remover foto." });
  }
});

// ── TELEFONE — ENVIAR CÓDIGO ──────────────────────────────────
app.post("/perfil/telefone/enviar", async (req, res) => {
  if (!req.usuario) return res.status(401).json({ mensagem: "Não autenticado." });
  const { telefone } = req.body;
  if (!telefone || telefone.trim().length < 8)
    return res.status(400).json({ mensagem: "Número de telefone inválido." });

  const codigo = gerarCodigo6();
  const exp = new Date(Date.now() + 10 * 60 * 1000);

  try {
    await db.query(
      "UPDATE usuarios SET telefone=$1, telefone_verificado=FALSE, telefone_codigo=$2, telefone_codigo_exp=$3 WHERE id=$4",
      [telefone.trim(), codigo, exp, req.usuario.id]
    );
    console.log(`[SMS SIMULADO] Código ${codigo} para ${telefone}`);
    res.json({
      mensagem: "Código enviado! (simulação: o código está no campo 'codigo' desta resposta)",
      codigo_simulado: codigo,
    });
  } catch (err) {
    console.error("Erro ao enviar código:", err.message);
    res.status(500).json({ mensagem: "Erro ao enviar código." });
  }
});

// ── TELEFONE — CONFIRMAR CÓDIGO ───────────────────────────────
app.post("/perfil/telefone/confirmar", async (req, res) => {
  if (!req.usuario) return res.status(401).json({ mensagem: "Não autenticado." });
  const { codigo } = req.body;
  if (!codigo) return res.status(400).json({ mensagem: "Informe o código." });

  try {
    const r = await db.query(
      "SELECT telefone_codigo, telefone_codigo_exp FROM usuarios WHERE id=$1",
      [req.usuario.id]
    );
    const u = r.rows[0];
    if (!u) return res.status(404).json({ mensagem: "Usuário não encontrado." });
    if (u.telefone_codigo !== codigo)
      return res.status(400).json({ mensagem: "Código incorreto." });
    if (new Date() > new Date(u.telefone_codigo_exp))
      return res.status(400).json({ mensagem: "Código expirado. Solicite um novo." });

    await db.query(
      "UPDATE usuarios SET telefone_verificado=TRUE, telefone_codigo=NULL, telefone_codigo_exp=NULL WHERE id=$1",
      [req.usuario.id]
    );
    res.json({ mensagem: "Telefone verificado com sucesso! ✅" });
  } catch (err) {
    console.error("Erro ao confirmar código:", err.message);
    res.status(500).json({ mensagem: "Erro ao confirmar código." });
  }
});

// ── CATEGORIAS ────────────────────────────────────────────────
app.get("/categorias", async (req, res) => {
  try {
    const r = await db.query("SELECT DISTINCT categoria FROM produtos ORDER BY categoria");
    res.json({ categorias: r.rows.map(r => r.categoria) });
  } catch (err) {
    console.error("Erro ao buscar categorias:", err.message);
    res.status(500).json({ mensagem: "Erro ao buscar categorias." });
  }
});

// ── LISTAR TODOS OS PRODUTOS (marketplace) ────────────────────
app.get("/produtos", async (req, res) => {
  const { categorias, busca, meus } = req.query;
  try {
    let query = `
      SELECT p.*, u.nome AS vendedor_nome, u.foto_url AS vendedor_foto
      FROM produtos p
      LEFT JOIN usuarios u ON u.id = p.usuario_id
      WHERE 1=1
    `;
    const params = [];

    if (meus === "1" && req.usuario) {
      params.push(req.usuario.id);
      query += ` AND p.usuario_id = $${params.length}`;
    }

    if (categorias) {
      params.push(categorias.split(","));
      query += ` AND p.categoria = ANY($${params.length})`;
    }

    if (busca) {
      params.push(`%${busca}%`);
      query += ` AND p.nome ILIKE $${params.length}`;
    }

    query += " ORDER BY p.criado_em DESC";
    const r = await db.query(query, params);
    res.json({ produtos: r.rows });
  } catch (err) {
    console.error("Erro ao buscar produtos:", err.message);
    res.status(500).json({ mensagem: "Erro ao buscar produtos." });
  }
});

// ── BUSCAR PRODUTO POR ID ─────────────────────────────────────
app.get("/produtos/:id", async (req, res) => {
  try {
    const r = await db.query(
      `SELECT p.*, u.nome AS vendedor_nome, u.foto_url AS vendedor_foto
       FROM produtos p LEFT JOIN usuarios u ON u.id = p.usuario_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ mensagem: "Produto não encontrado." });
    res.json({ produto: r.rows[0] });
  } catch (err) {
    console.error("Erro ao buscar produto:", err.message);
    res.status(500).json({ mensagem: "Erro ao buscar produto." });
  }
});

// ── CRIAR PRODUTO ─────────────────────────────────────────────
app.post("/produtos", async (req, res) => {
  if (!req.usuario) return res.status(401).json({ mensagem: "Não autenticado." });
  const { nome, descricao, preco, estoque, categoria, imagem_url } = req.body;
  if (!nome || !categoria || preco === undefined || estoque === undefined)
    return res.status(400).json({ mensagem: "Campos obrigatórios: nome, categoria, preco, estoque." });
  try {
    const r = await db.query(
      `INSERT INTO produtos (usuario_id, nome, descricao, preco, estoque, categoria, imagem_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.usuario.id, nome, descricao || "", Number(preco), Number(estoque), categoria, imagem_url || ""]
    );
    res.status(201).json({ produto: r.rows[0] });
  } catch (err) {
    console.error("Erro ao criar produto:", err.message);
    res.status(500).json({ mensagem: "Erro ao criar produto." });
  }
});

// ── ATUALIZAR PRODUTO (somente dono) ─────────────────────────
app.put("/produtos/:id", async (req, res) => {
  if (!req.usuario) return res.status(401).json({ mensagem: "Não autenticado." });
  const { nome, descricao, preco, estoque, categoria, imagem_url } = req.body;
  if (!nome || !categoria || preco === undefined || estoque === undefined)
    return res.status(400).json({ mensagem: "Campos obrigatórios: nome, categoria, preco, estoque." });
  try {
    const check = await db.query("SELECT usuario_id FROM produtos WHERE id=$1", [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ mensagem: "Produto não encontrado." });
    if (check.rows[0].usuario_id !== req.usuario.id)
      return res.status(403).json({ mensagem: "Você não pode editar este produto." });

    const r = await db.query(
      `UPDATE produtos SET nome=$1, descricao=$2, preco=$3, estoque=$4, categoria=$5, imagem_url=$6
       WHERE id=$7 RETURNING *`,
      [nome, descricao || "", Number(preco), Number(estoque), categoria, imagem_url || "", req.params.id]
    );
    res.json({ produto: r.rows[0] });
  } catch (err) {
    console.error("Erro ao atualizar produto:", err.message);
    res.status(500).json({ mensagem: "Erro ao atualizar produto." });
  }
});

// ── DELETAR PRODUTO (somente dono) ───────────────────────────
app.delete("/produtos/:id", async (req, res) => {
  if (!req.usuario) return res.status(401).json({ mensagem: "Não autenticado." });
  try {
    const check = await db.query("SELECT usuario_id FROM produtos WHERE id=$1", [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ mensagem: "Produto não encontrado." });
    if (check.rows[0].usuario_id !== req.usuario.id)
      return res.status(403).json({ mensagem: "Você não pode remover este produto." });

    await db.query("DELETE FROM produtos WHERE id=$1", [req.params.id]);
    res.json({ mensagem: "Produto removido com sucesso." });
  } catch (err) {
    console.error("Erro ao deletar produto:", err.message);
    res.status(500).json({ mensagem: "Erro ao deletar produto." });
  }
});

// ── CHATS ─────────────────────────────────────────────────────
// POST /chats — abre ou recupera um chat entre o comprador logado e o dono do produto.
// Retorna { chat, mensagens[] }
app.post("/chats", async (req, res) => {
  if (!req.usuario) return res.status(401).json({ mensagem: "Não autenticado." });
  const { produto_id } = req.body;
  if (!produto_id) return res.status(400).json({ mensagem: "produto_id é obrigatório." });

  try {
    // Busca o produto para descobrir o vendedor
    const prodResult = await db.query("SELECT usuario_id FROM produtos WHERE id=$1", [produto_id]);
    if (prodResult.rows.length === 0) return res.status(404).json({ mensagem: "Produto não encontrado." });

    const vendedor_id = prodResult.rows[0].usuario_id;
    const comprador_id = req.usuario.id;

    // Não pode abrir chat com si mesmo
    if (vendedor_id === comprador_id)
      return res.status(400).json({ mensagem: "Você não pode abrir um chat sobre seu próprio produto." });

    // Verifica se já existe um chat para este par (comprador, produto)
    let chatResult = await db.query(
      "SELECT * FROM chats WHERE produto_id=$1 AND comprador_id=$2",
      [produto_id, comprador_id]
    );

    let chat;
    if (chatResult.rows.length > 0) {
      chat = chatResult.rows[0];
    } else {
      // Cria novo chat
      const novo = await db.query(
        "INSERT INTO chats (produto_id, comprador_id, vendedor_id) VALUES ($1, $2, $3) RETURNING *",
        [produto_id, comprador_id, vendedor_id]
      );
      chat = novo.rows[0];
    }

    // Busca mensagens do chat
    const msgResult = await db.query(
      `SELECT m.*, u.nome AS remetente_nome
       FROM chat_mensagens m
       JOIN usuarios u ON u.id = m.remetente_id
       WHERE m.chat_id = $1
       ORDER BY m.criado_em ASC`,
      [chat.id]
    );

    res.json({ chat, mensagens: msgResult.rows });
  } catch (err) {
    console.error("Erro ao abrir chat:", err.message);
    res.status(500).json({ mensagem: "Erro ao abrir chat." });
  }
});

// GET /chats/:id/mensagens — lista mensagens de um chat (polling)
app.get("/chats/:id/mensagens", async (req, res) => {
  if (!req.usuario) return res.status(401).json({ mensagem: "Não autenticado." });
  const chat_id = req.params.id;

  try {
    // Garante que o usuário é participante do chat
    const check = await db.query(
      "SELECT * FROM chats WHERE id=$1 AND (comprador_id=$2 OR vendedor_id=$2)",
      [chat_id, req.usuario.id]
    );
    if (check.rows.length === 0) return res.status(403).json({ mensagem: "Acesso negado." });

    const msgResult = await db.query(
      `SELECT m.*, u.nome AS remetente_nome
       FROM chat_mensagens m
       JOIN usuarios u ON u.id = m.remetente_id
       WHERE m.chat_id = $1
       ORDER BY m.criado_em ASC`,
      [chat_id]
    );
    res.json({ mensagens: msgResult.rows });
  } catch (err) {
    console.error("Erro ao listar mensagens:", err.message);
    res.status(500).json({ mensagem: "Erro ao listar mensagens." });
  }
});

// POST /chats/:id/mensagens — envia uma mensagem em um chat
app.post("/chats/:id/mensagens", async (req, res) => {
  if (!req.usuario) return res.status(401).json({ mensagem: "Não autenticado." });
  const chat_id = req.params.id;
  const { texto } = req.body;
  if (!texto || !texto.trim()) return res.status(400).json({ mensagem: "Mensagem não pode ser vazia." });

  try {
    // Garante que o usuário é participante do chat
    const check = await db.query(
      "SELECT * FROM chats WHERE id=$1 AND (comprador_id=$2 OR vendedor_id=$2)",
      [chat_id, req.usuario.id]
    );
    if (check.rows.length === 0) return res.status(403).json({ mensagem: "Acesso negado." });

    const r = await db.query(
      `INSERT INTO chat_mensagens (chat_id, remetente_id, texto)
       VALUES ($1, $2, $3) RETURNING *`,
      [chat_id, req.usuario.id, texto.trim()]
    );

    // Retorna a mensagem com o nome do remetente
    const msg = { ...r.rows[0], remetente_nome: req.usuario.nome };
    res.status(201).json({ mensagem: msg });
  } catch (err) {
    console.error("Erro ao enviar mensagem:", err.message);
    res.status(500).json({ mensagem: "Erro ao enviar mensagem." });
  }
});

// GET /chats — lista todos os chats do usuário logado (para futura página de conversas)
app.get("/chats", async (req, res) => {
  if (!req.usuario) return res.status(401).json({ mensagem: "Não autenticado." });
  try {
    const r = await db.query(
      `SELECT c.*,
              p.nome AS produto_nome,
              comprador.nome AS comprador_nome,
              vendedor.nome  AS vendedor_nome,
              (SELECT texto FROM chat_mensagens m WHERE m.chat_id = c.id ORDER BY m.criado_em DESC LIMIT 1) AS ultima_mensagem,
              (SELECT criado_em FROM chat_mensagens m WHERE m.chat_id = c.id ORDER BY m.criado_em DESC LIMIT 1) AS ultima_mensagem_em
       FROM chats c
       JOIN produtos  p         ON p.id = c.produto_id
       JOIN usuarios  comprador ON comprador.id = c.comprador_id
       JOIN usuarios  vendedor  ON vendedor.id  = c.vendedor_id
       WHERE c.comprador_id=$1 OR c.vendedor_id=$1
       ORDER BY ultima_mensagem_em DESC NULLS LAST`,
      [req.usuario.id]
    );
    res.json({ chats: r.rows });
  } catch (err) {
    console.error("Erro ao listar chats:", err.message);
    res.status(500).json({ mensagem: "Erro ao listar chats." });
  }
});

// ── Auto-migration: garante que as colunas e tabelas existam ──
async function runMigration() {
  const stmts = [
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone            VARCHAR(20)  DEFAULT ''`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone_verificado BOOLEAN      DEFAULT FALSE`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone_codigo     VARCHAR(6)   DEFAULT NULL`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone_codigo_exp TIMESTAMP    DEFAULT NULL`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url            TEXT         DEFAULT ''`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bio                 TEXT         DEFAULT ''`,
    `ALTER TABLE produtos  ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE`,
    // Tabelas de chat
    `CREATE TABLE IF NOT EXISTS chats (
      id           SERIAL PRIMARY KEY,
      produto_id   INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
      comprador_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      vendedor_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      criado_em    TIMESTAMP DEFAULT NOW(),
      UNIQUE (produto_id, comprador_id)
    )`,
    `CREATE TABLE IF NOT EXISTS chat_mensagens (
      id           SERIAL PRIMARY KEY,
      chat_id      INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      remetente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      texto        TEXT    NOT NULL,
      criado_em    TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_chat_mensagens_chat_id ON chat_mensagens(chat_id)`,
  ];
  for (const sql of stmts) {
    try { await db.query(sql); } catch (e) { console.warn("Migration aviso:", e.message); }
  }
  console.log("Migration verificada.");
}

// ── Inicialização ─────────────────────────────────────────────
// Só sobe o servidor de fato quando o arquivo é executado diretamente
// (ex: `node server.js`). Quando importado por outro módulo — como nos
// testes automatizados via supertest — apenas o `app` é exportado,
// sem abrir porta nem rodar a migration.
if (require.main === module) {
  app.listen(config.PORT, async () => {
    console.log(`Servidor rodando em http://localhost:${config.PORT}`);
    await runMigration();
  });
}

module.exports = app;