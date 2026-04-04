const jwt = require("jsonwebtoken");

const SECRET = "segredo_super_forte";

const db = require("./db");

async function autenticar(req, res, next) {

  // rotas públicas (NÃO validam token)
  if (
    req.path === "/login" ||
    req.path === "/register" ||
    req.path === "/verificar"
  ) {
    return next();
  }

  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ mensagem: "Não autorizado" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);

    const result = await db.query(
      "SELECT id, nome, email FROM usuarios WHERE id = $1",[decoded.id]
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