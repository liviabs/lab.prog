const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("./config");
const db = require("./db");

// SOMENTE login, cadastro e verificação são públicos
const ROTAS_PUBLICAS = ["/login", "/register", "/verificar"];

async function autenticar(req, res, next) {
  const rotaPublica = ROTAS_PUBLICAS.some((rota) =>
    req.path === rota || req.path.startsWith(rota + "/")
  );

  if (rotaPublica) return next();

  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ mensagem: "Não autorizado" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await db.query(
      "SELECT id, nome, email FROM usuarios WHERE id = $1",
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ mensagem: "Usuário não encontrado" });
    }

    req.usuario = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ mensagem: "Token inválido ou expirado" });
  }
}

module.exports = autenticar;