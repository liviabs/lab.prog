import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import API from "../../api";

function Login() {
  const [email, setEmail]             = useState("");
  const [senha, setSenha]             = useState("");
  const [mensagem, setMensagem]       = useState("");
  const [carregando, setCarregando]   = useState(false);
  const [lembrar, setLembrar]         = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/verificar`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.logado) navigate("/home", { replace: true });
        else setVerificando(false);
      })
      .catch(() => setVerificando(false));
  }, [navigate]);

  async function entrar(e) {
    e.preventDefault();
    setMensagem("");

    if (!email || !senha) {
      setMensagem("Preencha todos os campos!");
      return;
    }

    setCarregando(true);
    try {
      const resposta = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, senha, lembrar }),
      });
      const dados = await resposta.json();

      if (resposta.ok) {
        navigate("/home", { replace: true });
      } else {
        setMensagem(dados.mensagem);
      }
    } catch {
      setMensagem("Erro ao conectar com o servidor.");
    } finally {
      setCarregando(false);
    }
  }

  if (verificando) {
    return <div className="container"><p>Carregando...</p></div>;
  }

  return (
    <div className="container">
      <form onSubmit={entrar} className="card animar">
        <h2>Login</h2>

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
            autoComplete="current-password"
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

        {mensagem && <p className="mensagem-erro">{mensagem}</p>}

        <p className="link">
          Não tem conta? <Link to="/register">Cadastre-se</Link>
        </p>
      </form>
    </div>
  );
}

export default Login;