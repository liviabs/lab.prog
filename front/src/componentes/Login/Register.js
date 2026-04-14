import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import API from "../../api";

function Register() {
  const [nome, setNome]             = useState("");
  const [email, setEmail]           = useState("");
  const [senha, setSenha]           = useState("");
  const [mensagem, setMensagem]     = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const navigate = useNavigate();

  async function cadastrar(e) {
    e.preventDefault();
    setMensagem("");

    if (!nome || !email || !senha) {
      setMensagem("Preencha todos os campos!");
      return;
    }

    setCarregando(true);
    try {
      const resposta = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nome, email, senha }),
      });
      const dados = await resposta.json();
      setMensagem(dados.mensagem);

      if (resposta.ok) {
        setTimeout(() => navigate("/"), 1500);
      }
    } catch {
      setMensagem("Erro ao conectar com o servidor.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="container">
      <form onSubmit={cadastrar} className="card animar">
        <h2>Cadastro</h2>

        <input
          type="text"
          placeholder="Digite seu nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoComplete="name"
        />

        <input
          type="email"
          placeholder="Digite seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <div className="input-senha">
          <input
            type={mostrarSenha ? "text" : "password"}
            placeholder="Digite sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="new-password"
          />
          <span
            className="icone-olho"
            onClick={() => setMostrarSenha((v) => !v)}
            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
          >
            {mostrarSenha ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>

        <button type="submit" disabled={carregando}>
          {carregando ? "Cadastrando..." : "Cadastrar"}
        </button>

        {mensagem && <p className="mensagem-erro">{mensagem}</p>}

        <p className="link">
          Já tem conta? <Link to="/">Entrar</Link>
        </p>
      </form>
    </div>
  );
}

export default Register;