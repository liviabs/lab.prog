// Testes de integração das rotas do backend.
// O módulo `db` é mockado (ver __mocks__/db.js), então nenhum teste
// aqui depende de um banco de dados real.
process.env.JWT_SECRET = "segredo-de-teste";
process.env.NODE_ENV = "test";

jest.mock("../db");

const request = require("supertest");
const bcrypt = require("bcrypt");
const db = require("../db");
const app = require("../server");

beforeEach(() => {
  db.query.mockReset();
});

describe("GET /health", () => {
  test("retorna status ok quando o banco responde", async () => {
    db.query.mockResolvedValueOnce({ rows: [{ "?column?": 1 }] });

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.banco).toBe("conectado");
  });

  test("retorna status degradado quando o banco falha", async () => {
    db.query.mockRejectedValueOnce(new Error("conexão recusada"));

    const res = await request(app).get("/health");

    expect(res.status).toBe(503);
    expect(res.body.status).toBe("degradado");
  });
});

describe("POST /register", () => {
  test("rejeita quando faltam campos obrigatórios", async () => {
    const res = await request(app).post("/register").send({ email: "a@a.com" });

    expect(res.status).toBe(400);
    expect(res.body.mensagem).toMatch(/preencha todos os campos/i);
    expect(db.query).not.toHaveBeenCalled();
  });

  test.each([
    ["curta1", "menos de 8 caracteres"],
    ["semnumeros", "sem número"],
    ["12345678", "sem letra"],
  ])("rejeita senha inválida: %s (%s)", async (senha) => {
    const res = await request(app)
      .post("/register")
      .send({ nome: "Fulano", email: "fulano@teste.com", senha });

    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });

  test("cadastra usuário com dados válidos", async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/register")
      .send({ nome: "Fulano", email: "fulano@teste.com", senha: "senha123" });

    expect(res.status).toBe(201);
    expect(res.body.mensagem).toMatch(/cadastrado com sucesso/i);
  });

  test("retorna 409 quando o e-mail já existe", async () => {
    const erro = new Error("duplicado");
    erro.code = "23505";
    db.query.mockRejectedValueOnce(erro);

    const res = await request(app)
      .post("/register")
      .send({ nome: "Fulano", email: "existente@teste.com", senha: "senha123" });

    expect(res.status).toBe(409);
    expect(res.body.mensagem).toMatch(/já cadastrado/i);
  });
});

describe("POST /login", () => {
  test("rejeita quando faltam campos", async () => {
    const res = await request(app).post("/login").send({ email: "a@a.com" });
    expect(res.status).toBe(400);
  });

  test("rejeita credenciais inválidas quando o usuário não existe", async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/login")
      .send({ email: "naoexiste@teste.com", senha: "qualquer123" });

    expect(res.status).toBe(401);
    expect(res.body.mensagem).toMatch(/inválidos/i);
  });

  test("rejeita credenciais inválidas quando a senha está errada", async () => {
    const hash = await bcrypt.hash("senhaCorreta1", 12);
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, nome: "Fulano", email: "fulano@teste.com", senha: hash }],
    });

    const res = await request(app)
      .post("/login")
      .send({ email: "fulano@teste.com", senha: "senhaErrada1" });

    expect(res.status).toBe(401);
  });

  test("autentica com credenciais corretas e define o cookie de sessão", async () => {
    const hash = await bcrypt.hash("senhaCorreta1", 12);
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, nome: "Fulano", email: "fulano@teste.com", senha: hash }],
    });

    const res = await request(app)
      .post("/login")
      .send({ email: "fulano@teste.com", senha: "senhaCorreta1" });

    expect(res.status).toBe(200);
    expect(res.body.mensagem).toMatch(/sucesso/i);
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"][0]).toMatch(/^token=/);
  });
});

describe("Rotas protegidas sem autenticação", () => {
  test("GET /perfil sem cookie retorna 401", async () => {
    const res = await request(app).get("/perfil");
    expect(res.status).toBe(401);
  });

  test("POST /produtos sem cookie retorna 401", async () => {
    const res = await request(app).post("/produtos").send({});
    expect(res.status).toBe(401);
  });
});

describe("GET /produtos (rota pública)", () => {
  test("lista produtos sem exigir autenticação", async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, nome: "Produto teste" }] });

    const res = await request(app).get("/produtos");

    expect(res.status).toBe(200);
    expect(res.body.produtos).toHaveLength(1);
  });
});
