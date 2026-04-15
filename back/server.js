require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const config = require("./config");
const db = require("./db");
const autenticar = require("./auth");

const app = express();

// ── Middlewares globais ───────────────────────────────────────
app.use(cors({
  origin: config.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ── Rate limiting ─────────────────────────────────────────────
const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2,
  message: { mensagem: "Muitas tentativas. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/login", limiterAuth);
app.use("/register", limiterAuth);

// ── Autenticação ──────────────────────────────────────────────
app.use(autenticar);

// ── Helpers ───────────────────────────────────────────────────
function gerarCookie(res, token, lembrar) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: lembrar ? 24 * 60 * 60 * 1000 : 60 * 1000, // 24h ou 1 minuto
  });
}

function validarSenha(senha) {
  if (senha.length < 8)      return "A senha deve ter no mínimo 8 caracteres.";
  if (!/[a-zA-Z]/.test(senha)) return "A senha deve conter ao menos uma letra.";
  if (!/[0-9]/.test(senha))  return "A senha deve conter ao menos um número.";
  return null;
}

// ── Rotas ─────────────────────────────────────────────────────

// REGISTER
app.post("/register", async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ mensagem: "Preencha todos os campos!" });
  }

  const erroSenha = validarSenha(senha);
  if (erroSenha) return res.status(400).json({ mensagem: erroSenha });

  try {
    const senhaCriptografada = await bcrypt.hash(senha, 12);
    await db.query(
      "INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3)",
      [nome, email, senhaCriptografada]
    );
    res.status(201).json({ mensagem: "Usuário cadastrado com sucesso!" });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ mensagem: "E-mail já cadastrado!" });
    }
    console.error("Erro no register:", err.message);
    res.status(500).json({ mensagem: "Erro ao cadastrar usuário." });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  const { email, senha, lembrar } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ mensagem: "Preencha todos os campos!" });
  }

  try {
    const result = await db.query(
      "SELECT * FROM usuarios WHERE email = $1", [email]
    );
    const usuario = result.rows[0];

    // Hash falso para evitar timing attack quando usuário não existe
    const senhaFalsa = "$2b$12$invalido.hash.para.evitar.timing.attack.xxxxx";
    const senhaCorreta = await bcrypt.compare(
      senha,
      usuario ? usuario.senha : senhaFalsa
    );

    if (!usuario || !senhaCorreta) {
      return res.status(401).json({ mensagem: "E-mail ou senha inválidos." });
    }

    const expiracao = lembrar
      ? config.JWT_EXPIRES_LEMBRAR
      : config.JWT_EXPIRES_SESSAO;

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

// VERIFICAR SESSÃO
app.get("/verificar", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ logado: false, usuario: null });

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    res.json({ logado: true, usuario: decoded });
  } catch {
    res.clearCookie("token");
    res.json({ logado: false, usuario: null });
  }
});

// HOME — rota protegida
app.get("/home", (req, res) => {
  res.json({ mensagem: "Acesso permitido!", usuario: req.usuario });
});

// LOGOUT
app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ mensagem: "Logout realizado!" });
});

// LISTAR CATEGORIAS DISPONÍVEIS
app.get("/categorias", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT DISTINCT categoria FROM produtos ORDER BY categoria"
    );
    const categorias = result.rows.map((r) => r.categoria);
    res.json({ categorias });
  } catch (err) {
    console.error("Erro ao buscar categorias:", err.message);
    res.status(500).json({ mensagem: "Erro ao buscar categorias." });
  }
});

// LISTAR PRODUTOS (com filtro opcional por categoria e busca por nome)
app.get("/produtos", async (req, res) => {
  const { categorias, busca } = req.query;

  try {
    let query  = "SELECT * FROM produtos WHERE 1=1";
    const params = [];

    if (categorias) {
      const lista = categorias.split(",");
      params.push(lista);
      query += ` AND categoria = ANY($${params.length})`;
    }

    if (busca) {
      params.push(`%${busca}%`);
      query += ` AND nome ILIKE $${params.length}`;
    }

    query += " ORDER BY criado_em DESC";

    const result = await db.query(query, params);
    res.json({ produtos: result.rows });
  } catch (err) {
    console.error("Erro ao buscar produtos:", err.message);
    res.status(500).json({ mensagem: "Erro ao buscar produtos." });
  }
});

// BUSCAR UM PRODUTO POR ID
app.get("/produtos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      "SELECT * FROM produtos WHERE id = $1", [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ mensagem: "Produto não encontrado." });
    }
    res.json({ produto: result.rows[0] });
  } catch (err) {
    console.error("Erro ao buscar produto:", err.message);
    res.status(500).json({ mensagem: "Erro ao buscar produto." });
  }
});

// ── Inicialização ─────────────────────────────────────────────
app.listen(config.PORT, () => {
  console.log(`Servidor rodando em http://localhost:${config.PORT}`);
});