import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { apiFetch } from "../../api";

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
    apiFetch("/verificar")
      .then((r) => r.json())
      .then((d) => {
        if (d.logado) navigate("/bemvindo", { replace: true });
        else setVerificando(false);
      })
      .catch(() => setVerificando(false));
  }, [navigate]);

  async function entrar(e) {
    e.preventDefault();
    setMensagem("");
    if (!email || !senha) { setMensagem("Preencha todos os campos."); return; }
    setCarregando(true);
    try {
      const r = await apiFetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha, lembrar }),
      });
      const d = await r.json();
      if (r.ok) navigate("/bemvindo", { replace: true });
      else setMensagem(d.mensagem || "Credenciais inválidas.");
    } catch (err) {
      setMensagem(err.message);
    } finally {
      setCarregando(false);
    }
  }

  if (verificando) return (
    <div className="page-loading">
      <div className="big-spinner" />
      <span>Verificando sessão...</span>
    </div>
  );

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🛍️</div>
          <span className="auth-logo-text">StoreApp</span>
        </div>

        <h1 className="auth-title">Bem-vindo de volta</h1>
        <p className="auth-subtitle">Entre com suas credenciais para continuar</p>

        <form onSubmit={entrar}>
          <div className="field">
            <label>E-mail</label>
            <div className="field-input-wrap">
              <FaEnvelope className="field-icon" />
              <input
                type="email" placeholder="seu@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="field">
            <label>Senha</label>
            <div className="field-input-wrap">
              <FaLock className="field-icon" />
              <input
                type={mostrarSenha ? "text" : "password"} placeholder="••••••••"
                value={senha} onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: "42px" }}
              />
              <button type="button" className="eye-btn" onClick={() => setMostrarSenha(v => !v)}>
                {mostrarSenha ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <label className="check-label">
            <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
            Lembrar de mim por 24 horas
          </label>

          {mensagem && <div className="alert alert-error">⚠️ {mensagem}</div>}

          <button type="submit" className="btn btn-primary" disabled={carregando}>
            {carregando ? <><span className="spinner" /> Entrando...</> : "Entrar →"}
          </button>
        </form>

        <p className="auth-footer">
          Não tem conta? <Link to="/register">Criar conta grátis</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
