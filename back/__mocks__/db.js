// Mock manual do módulo `db` (pool do pg) usado nos testes.
// Evita qualquer tentativa de conexão real com o PostgreSQL.
module.exports = {
  query: jest.fn(),
};
