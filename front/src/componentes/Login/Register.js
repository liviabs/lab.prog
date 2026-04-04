import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./style.css";

function Register() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");

  const navigate = useNavigate();

  async function cadastrar(e) {
    e.preventDefault();

    if (!nome || !email || !senha) {
      setMensagem("Preencha todos os campos!");
      return;
    }

    try {
      const resposta = await fetch("http://localhost:3001/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ nome, email, senha }),
      });

      const dados = await resposta.json();
      setMensagem(dados.mensagem);

      if (dados.mensagem.includes("sucesso")) {
        setTimeout(() => {
          navigate("/");
        }, 1500);
      }

    } catch (erro) {
      setMensagem("Erro ao conectar com o servidor!");
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
        />

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

        <button type="submit">Cadastrar</button>

        <p className="link">
          Já tem conta? <Link to="/">Entrar</Link>
        </p>

        <p>{mensagem}</p>
      </form>
    </div>
  );
}

export default Register;