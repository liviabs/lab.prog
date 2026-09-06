process.env.JWT_SECRET = "segredo-de-teste";

jest.mock("../db");

const jwt = require("jsonwebtoken");
const db = require("../db");
const autenticar = require("../auth");
const { JWT_SECRET } = require("../config");

function mockReqRes({ path, method = "GET", token } = {}) {
  const req = { path, method, cookies: token ? { token } : {} };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

beforeEach(() => {
  db.query.mockReset();
});

test("permite acesso direto a rotas públicas, mesmo sem token", async () => {
  const { req, res, next } = mockReqRes({ path: "/login", method: "POST" });

  await autenticar(req, res, next);

  expect(next).toHaveBeenCalled();
  expect(db.query).not.toHaveBeenCalled();
});

test("bloqueia rota protegida sem token com 401", async () => {
  const { req, res, next } = mockReqRes({ path: "/perfil" });

  await autenticar(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});

test("libera rota protegida com token válido e usuário existente", async () => {
  const token = jwt.sign({ id: 42 }, JWT_SECRET);
  db.query.mockResolvedValueOnce({
    rows: [{ id: 42, nome: "Fulano", email: "fulano@teste.com" }],
  });
  const { req, res, next } = mockReqRes({ path: "/perfil", token });

  await autenticar(req, res, next);

  expect(next).toHaveBeenCalled();
  expect(req.usuario).toEqual({ id: 42, nome: "Fulano", email: "fulano@teste.com" });
});

test("bloqueia com 401 e limpa o cookie quando o token é inválido", async () => {
  const { req, res, next } = mockReqRes({ path: "/perfil", token: "token-invalido" });

  await autenticar(req, res, next);

  expect(res.clearCookie).toHaveBeenCalledWith("token");
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});

test("GET /produtos é público mas decodifica o usuário quando há token válido", async () => {
  const token = jwt.sign({ id: 7 }, JWT_SECRET);
  db.query.mockResolvedValueOnce({
    rows: [{ id: 7, nome: "Vendedor", email: "vendedor@teste.com" }],
  });
  const { req, res, next } = mockReqRes({ path: "/produtos", token });

  await autenticar(req, res, next);

  expect(next).toHaveBeenCalled();
  expect(req.usuario).toEqual({ id: 7, nome: "Vendedor", email: "vendedor@teste.com" });
});

test("GET /produtos continua liberado mesmo com token inválido (sem usuário)", async () => {
  const { req, res, next } = mockReqRes({ path: "/produtos", token: "token-invalido" });

  await autenticar(req, res, next);

  expect(next).toHaveBeenCalled();
  expect(req.usuario).toBeUndefined();
});
