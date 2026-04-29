const { Pool } = require("pg");

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10,
});

// Testa a conexão sem crashar o servidor
db.connect()
  .then((client) => {
    console.log("✅ Banco de dados conectado com sucesso!");
    client.release();
  })
  .catch((err) => {
    console.error("⚠️  Aviso: Não foi possível conectar ao banco de dados.");
    console.error("   Motivo:", err.message);
    console.error("   Verifique o DATABASE_URL no arquivo back/.env");
    console.error("   O servidor continuará rodando, mas as rotas de dados falharão.");
  });

// Trata erros de pool globalmente (evita crash do processo)
db.on("error", (err) => {
  console.error("Erro inesperado no pool do banco:", err.message);
});

module.exports = db;