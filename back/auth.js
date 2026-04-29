const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("./config");
const db = require("./db");

// Rotas 100% públicas — sem token necessário de forma alguma
const PUBLICAS = ["/login", "/register", "/verificar", "/health"];

async function autenticar(req, res, next) {
  // 1. Rota pública — passa direto
  if (PUBLICAS.includes(req.path)) return next();

  const token = req.cookies.token;

  // 2. GET /produtos e GET /categorias — qualquer um pode ver,
  //    mas se tiver token decodifica para saber quem é o usuário
  const ehGetPublico =
    req.method === "GET" &&
    (req.path === "/produtos" ||
      req.path.startsWith("/produtos/") ||
      req.path === "/categorias");

  if (ehGetPublico) {
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const r = await db.query(
          "SELECT id, nome, email FROM usuarios WHERE id = $1",
          [decoded.id]
        );
        if (r.rows.length > 0) req.usuario = r.rows[0];
      } catch (_) { /* token inválido/expirado: continua sem usuário */ }
    }
    return next();
  }

  // 3. Todas as outras rotas — token obrigatório
  if (!token) {
    return res
      .status(401)
      .json({ mensagem: "Sessão expirada. Faça login novamente." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const r = await db.query(
      "SELECT id, nome, email FROM usuarios WHERE id = $1",
      [decoded.id]
    );
    if (r.rows.length === 0) {
      res.clearCookie("token");
      return res.status(401).json({ mensagem: "Usuário não encontrado." });
    }
    req.usuario = r.rows[0];
    next();
  } catch (err) {
    res.clearCookie("token");
    return res.status(401).json({ mensagem: "Sessão expirada. Faça login novamente." });
  }
}

module.exports = autenticar;
