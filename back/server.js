const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

// 🔐 JWT e Cookies
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();

// 🔥 CORS (necessário para cookies com React)
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// 🔐 segredo do token
const SECRET = "segredo_super_forte";

// 🔌 conexão com banco
const db = new Pool({
  user: "postgres",
  host: "localhost",
  database: "Projeto_LabProg",
  password: "12345",
  port: 5432,
});


// 🔐 MIDDLEWARE DE AUTENTICAÇÃO
function autenticar(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ mensagem: "Não autorizado" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ mensagem: "Token inválido ou expirado" });
  }
}


// ✅ REGISTER
app.post("/register", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.json({ mensagem: "Preencha todos os campos!" });
  }

  try {
    const senhaCriptografada = await bcrypt.hash(senha, 10);

    await db.query(
      "INSERT INTO usuarios (email, senha) VALUES ($1, $2)",
      [email, senhaCriptografada]
    );

    res.json({ mensagem: "Usuário cadastrado com sucesso!" });

  } catch (err) {
    console.log(err);
    res.json({ mensagem: "Erro ao cadastrar usuário!" });
  }
});


// ✅ LOGIN
app.post("/login", async (req, res) => {
  const { email, senha, lembrar } = req.body;

  if (!email || !senha) {
    return res.json({ mensagem: "Preencha todos os campos!" });
  }

  try {
    const result = await db.query(
      "SELECT * FROM usuarios WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.json({ mensagem: "Email ou senha inválidos!" });
    }

    const usuario = result.rows[0];

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) {
      return res.json({ mensagem: "Email ou senha inválidos!" });
    }

    // ⏱️ tempo dinâmico
    const tempoToken = lembrar ? "24h" : "1m";
    const tempoCookie = lembrar
      ? 24 * 60 * 60 * 1000
      : 60 * 1000;

    // 🔐 JWT
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      SECRET,
      { expiresIn: tempoToken }
    );

    // 🍪 COOKIE
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: tempoCookie,
    });

    res.json({ mensagem: "Login realizado com sucesso!" });

  } catch (err) {
    console.log(err);
    res.json({ mensagem: "Erro no servidor!" });
  }
});


// 🔒 ROTA PROTEGIDA
app.get("/home", autenticar, (req, res) => {
  res.json({
    mensagem: "Acesso permitido!",
    usuario: req.usuario
  });
});


// 🚪 LOGOUT
app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ mensagem: "Logout realizado!" });
});


// 🚀 SERVER
app.listen(3001, () => {
  console.log("Servidor rodando em http://localhost:3001");
});