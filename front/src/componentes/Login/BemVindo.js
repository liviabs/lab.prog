import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import API from "../../api";

const POLLING_INTERVAL = 30 * 1000;

function BemVindo() {
  const [usuario, setUsuario]     = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/verificar`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!data.logado) navigate("/", { replace: true });
        else setUsuario(data.usuario);
      })
      .catch(() => navigate("/", { replace: true }));
  }, [navigate]);

  useEffect(() => {
    const intervalo = setInterval(() => {
      fetch(`${API}/verificar`, { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (!data.logado) navigate("/", { replace: true });
        })
        .catch(() => navigate("/", { replace: true }));
    }, POLLING_INTERVAL);

    return () => clearInterval(intervalo);
  }, [navigate]);

  async function logout() {
    try {
      await fetch(`${API}/logout`, { method: "POST", credentials: "include" });
    } catch {
      // redireciona de qualquer forma
    }
    navigate("/", { replace: true });
  }

  if (!usuario) {
    return <div className="container"><p>Carregando...</p></div>;
  }

  return (
    <div className="pagina">

      <div className="topo">
        <div className="menu" onClick={() => setMenuAberto((v) => !v)}>☰</div>
        <div className="titulo"><h2>Bem-vindo, {usuario.nome}</h2></div>
        <div className="perfil"><FaUserCircle /></div>
      </div>

      {menuAberto && (
        <nav className="menu-lateral">
          <button onClick={() => navigate("/home")}>Início</button>
          <button onClick={() => navigate("/usuarios")}>Usuários</button>
          <button onClick={() => navigate("/produtos")}>Produtos</button>
          <button onClick={logout}>Sair</button>
        </nav>
      )}

      <div className="busca-container">
        <input
          type="text"
          placeholder="Pesquisar..."
          className="input-busca"
        />
      </div>

    </div>
  );
}

export default BemVindo;