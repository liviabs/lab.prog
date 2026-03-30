import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [lembrar, setLembrar] = useState(false);

  const navigate = useNavigate();

  async function entrar(e) {
    e.preventDefault();

    if (!email || !senha) {
      setMensagem("Preencha todos os campos!");
      return;
    }

    setCarregando(true);

    try {
      const resposta = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, senha, lembrar }),
      });

      const dados = await resposta.json();
      setMensagem(dados.mensagem);

      if (dados.mensagem === "Login realizado com sucesso!") {
        navigate("/home");
      }

    } catch (erro) {
      setMensagem("Erro ao conectar com o servidor!");
    }

    setCarregando(false);
  }

  return (
    <div className="container">
      <form onSubmit={entrar} className="card animar">
        <h2>Login</h2>

        <input
          type="email"
          placeholder="Digite seu email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Digite sua senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        <button type="submit" disabled={carregando}>
          {carregando ? "Entrando..." : "Entrar"}
        </button>

        <label className="lembrar">
          <input
            type="checkbox"
            checked={lembrar}
            onChange={(e) => setLembrar(e.target.checked)}
          />
          Lembrar de mim
        </label>

        <p className="link">
          Não tem conta? <Link to="/register">Cadastre-se</Link>
        </p>

        <p>{mensagem}</p>
      </form>
    </div>
  );
}

export default Login;