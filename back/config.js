require("dotenv").config();

const config = {
  JWT_SECRET: process.env.JWT_SECRET || "fcff866e2828e2f8eba71230f64903f92fd928d024167df9abd1e0099946d07ee1a36c3125d8394d4a7883fb5892770f403a6082fb65c03af30076b40dae342a",
  JWT_EXPIRES_LEMBRAR: process.env.JWT_EXPIRES_LEMBRAR || "24h",
  JWT_EXPIRES_SESSAO:  process.env.JWT_EXPIRES_SESSAO  || "2h",   // era "1m" — corrigido para 2h
  PORT:       process.env.PORT       || 3001,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
};

module.exports = config;
