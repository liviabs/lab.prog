import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { apiFetch } from "../../api";

function Register() {
  const [nome, setNome]               = useState("");
  const [email, setEmail]             = useState("");
  const [senha, setSenha]             = useState("");
  const [mensagem, setMensagem]       = useState({ tipo: "", texto: "" });
  const [carregando, setCarregando]   = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const navigate = useNavigate();

  async function cadastrar(e) {
    e.preventDefault();
    setMensagem({ tipo: "", texto: "" });

    if (!nome || !email || !senha) {
      setMensagem({ tipo: "error", texto: "Preencha todos os campos." });
      return;
    }

    setCarregando(true);
    try {
      const r = await apiFetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha }),
      });
      const d = await r.json();

      if (r.ok) {
        setMensagem({ tipo: "success", texto: "Conta criada! Redirecionando..." });
        setTimeout(() => navigate("/"), 1500);
      } else {
        setMensagem({ tipo: "error", texto: d.mensagem || "Erro ao criar conta." });
      }
    } catch (err) {
      setMensagem({ tipo: "error", texto: err.message });
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🛍️</div>
          <span className="auth-logo-text">StoreApp</span>
        </div>

        <h1 className="auth-title">Criar conta</h1>
        <p className="auth-subtitle">Preencha os dados para se cadastrar</p>

        <form onSubmit={cadastrar}>
          <div className="field">
            <label>Nome completo</label>
            <div className="field-input-wrap">
              <FaUser className="field-icon" />
              <input
                type="text" placeholder="Seu nome"
                value={nome} onChange={(e) => setNome(e.target.value)}
                autoComplete="name"
              />
            </div>
          </div>

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
                type={mostrarSenha ? "text" : "password"} placeholder="Mínimo 8 caracteres"
                value={senha} onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                style={{ paddingRight: "42px" }}
              />
              <button type="button" className="eye-btn" onClick={() => setMostrarSenha(v => !v)}>
                {mostrarSenha ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {mensagem.texto && (
            <div className={`alert alert-${mensagem.tipo === "success" ? "success" : "error"}`}>
              {mensagem.tipo === "success" ? "✅" : "⚠️"} {mensagem.texto}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={carregando}>
            {carregando ? <><span className="spinner" /> Criando conta...</> : "Criar conta →"}
          </button>
        </form>

        <p className="auth-footer">
          Já tem conta? <Link to="/">Fazer login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
