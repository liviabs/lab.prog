const jwt = require("jsonwebtoken");

const SECRET = "segredo_super_forte";

function autenticar(req, res, next) {

  // rotas públicas
  if (
    req.path.startsWith("/login") ||
    req.path.startsWith("/register")
  ) {
    return next();
  }

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

module.exports = autenticar;