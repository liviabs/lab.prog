const express = require("express");
const app = express();

const cors = require("cors");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

//  JWT e Cookies
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

// CORS (necessário para cookies com React)
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

//MIDDLEWARE
const autenticar = require("./auth");
app.use(autenticar);

const SECRET = "segredo_super_forte";

// conexão com banco
const db = new Pool({
  user: "postgres",
  host: "localhost",
  database: "Projeto_LabProg",
  password: "12345",
  port: 5432,
});



// REGISTER
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
    if (err.code === "23505") {
      return res.json({ mensagem: "Usuário já cadastrado!" });
    }

    res.json({ mensagem: "Erro ao cadastrar usuário!" });
  }
});


// LOGIN
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

    // tempo dinâmico
    const tempoToken = lembrar ? "24h" : "1m";
    const tempoCookie = lembrar
      ? 24 * 60 * 60 * 1000
      : 60 * 1000;

    //  JWT
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      SECRET,
      { expiresIn: tempoToken }
    );

    // COOKIE
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


// VERIFICAR SE ESTÁ LOGADO
app.get("/verificar", (req, res) => {
  res.json({
    logado: true,
    usuario: req.usuario
  });
});


// ROTA PROTEGIDA
app.get("/home", (req, res) => {
  res.json({
    mensagem: "Acesso permitido!",
    usuario: req.usuario
  });
});


// LOGOUT
app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ mensagem: "Logout realizado!" });
});


// SERVER
app.listen(3001, () => {
  console.log("Servidor rodando em http://localhost:3001");
});