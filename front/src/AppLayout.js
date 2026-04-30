import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaTachometerAlt, FaBox, FaSignOutAlt, FaBars, FaTimes,
  FaStore, FaUser
} from "react-icons/fa";
import { apiFetch } from "./api";
 
 
const NAV_ITEMS = [
  { icon: <FaTachometerAlt />, label: "Dashboard",    path: "/bemvindo" },
  { icon: <FaStore />,         label: "Marketplace",  path: "/produtos" },
  { icon: <FaBox />,           label: "Meus Produtos", path: "/produtos?meus=1" },
  { icon: <FaUser />,          label: "Perfil",        path: "/perfil" },
];
 
// ─── Avatar: mostra foto se existir, senão iniciais ──────────
function Avatar({ fotoUrl, initials, size = 32, fontSize = 11, style = {} }) {
  const [imgErro, setImgErro] = useState(false);
 
  // Resetar erro quando a foto mudar
  useEffect(() => { setImgErro(false); }, [fotoUrl]);
 
  const base = {
    width: size, height: size, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, overflow: "hidden",
    background: "linear-gradient(135deg, var(--accent), #a855f7)",
    fontSize, fontWeight: 700, color: "#fff",
    ...style,
  };
 
  if (fotoUrl && !imgErro) {
    return (
      <div style={base}>
        <img
          src={fotoUrl}
          alt="Foto"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setImgErro(true)}
        />
      </div>
    );
  }
 
  return <div style={base}>{initials}</div>;
}
 
function AppLayout({ children, title }) {
  const [usuario, setUsuario]     = useState(null);
  const [sidebarOpen, setSidebar] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
 
  useEffect(() => {
    apiFetch("/perfil")
      .then(r => r.json())
      .then(d => { if (d.perfil) setUsuario(d.perfil); })
      .catch(() => {});
  }, []);
 
  useEffect(() => {
    apiFetch("/perfil")
      .then(r => r.json())
      .then(d => { if (d.perfil) setUsuario(d.perfil); })
      .catch(() => {});
  }, [location.pathname]);
 
  async function logout() {
    await apiFetch("/logout", { method: "POST" }).catch(() => {});
    navigate("/", { replace: true });
  }
 
  const initials = usuario?.nome
    ? usuario.nome.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
 
  function isActive(path) {
    if (path.includes("?")) {
      const [p, q] = path.split("?");
      return location.pathname === p && location.search === "?" + q;
    }
    return location.pathname === path && !location.search.includes("meus=1");
  }
 
  return (
    <div className="app-shell">
      {sidebarOpen && (
        <div className="sidebar-overlay show" onClick={() => setSidebar(false)} />
      )}
 
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">🛍️</div>
            <span className="sidebar-logo-name">StoreApp</span>
          </div>
        </div>
 
        <nav className="sidebar-nav">
          <div className="nav-section-title">Menu</div>
          {NAV_ITEMS.map(item => (
            <button
              key={item.path}
              className={`nav-item ${isActive(item.path) ? "active" : ""}`}
              onClick={() => {
                if (item.path.includes("?")) {
                  const [p, q] = item.path.split("?");
                  navigate(p + "?" + q);
                } else {
                  navigate(item.path);
                }
                setSidebar(false);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
 
        <div className="sidebar-footer">
          {usuario && (
            <div className="user-badge">
              <Avatar
                fotoUrl={usuario.foto_url}
                initials={initials}
                size={34}
                fontSize={12}
                style={{ cursor: "pointer" }}
              />
              <div
                className="user-info"
                style={{ cursor: "pointer" }}
                onClick={() => { navigate("/perfil"); setSidebar(false); }}
              >
                <div className="user-name">{usuario.nome}</div>
                <div className="user-email">{usuario.email}</div>
              </div>
              <button className="logout-btn" onClick={logout} title="Sair">
                <FaSignOutAlt />
              </button>
            </div>
          )}
        </div>
      </aside>
 
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger" onClick={() => setSidebar(v => !v)}>
              {sidebarOpen ? <FaTimes /> : <FaBars />}
            </button>
            <span className="topbar-title">{title}</span>
          </div>
          <div className="topbar-actions"></div>
        </header>
 
        <main className="page-body">
          {children}
        </main>
      </div>
    </div>
  );
}
 
export default AppLayout;