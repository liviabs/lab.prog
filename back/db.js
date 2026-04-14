const { Pool } = require("pg");

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

db.connect()
  .then(() => console.log("Banco de dados conectado"))
  .catch((err) => {
    console.error("Erro ao conectar ao banco:", err.message);
    process.exit(1);
  });

module.exports = db;