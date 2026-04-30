import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaTachometerAlt, FaBox, FaSignOutAlt, FaBars, FaTimes,
  FaStore, FaUser, FaCommentDots, FaChevronLeft, FaChevronRight,
} from "react-icons/fa";
import { apiFetch } from "./api";

const NAV_ITEMS = [
  { icon: <FaTachometerAlt />, label: "Dashboard",    path: "/bemvindo" },
  { icon: <FaStore />,         label: "Marketplace",  path: "/produtos" },
  { icon: <FaBox />,           label: "Meus Produtos", path: "/produtos?meus=1" },
  { icon: <FaUser />,          label: "Perfil",        path: "/perfil" },
];

// ─── Avatar ───────────────────────────────────────────────────
function Avatar({ fotoUrl, initials, size = 32, fontSize = 11, style = {} }) {
  const [imgErro, setImgErro] = useState(false);
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
        <img src={fotoUrl} alt="Foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setImgErro(true)} />
      </div>
    );
  }
  return <div style={base}>{initials}</div>;
}

// ─── Modal de Chat (embutido no AppLayout) ────────────────────
function ModalChatLayout({ chat, usuarioId, onClose }) {
  const [mensagens, setMensagens]   = useState([]);
  const [texto, setTexto]           = useState("");
  const [enviando, setEnviando]     = useState(false);
  const [carregando, setCarregando] = useState(true);
  const bottomRef = useRef(null);

  const carregarMensagens = useCallback(async () => {
    try {
      const r = await apiFetch(`/chats/${chat.id}/mensagens`);
      const d = await r.json();
      if (r.ok) setMensagens(d.mensagens || []);
    } catch {}
  }, [chat.id]);

  useEffect(() => {
    carregarMensagens().finally(() => setCarregando(false));
  }, [carregarMensagens]);

  // Polling a cada 3s
  useEffect(() => {
    const t = setInterval(carregarMensagens, 3000);
    return () => clearInterval(t);
  }, [carregarMensagens]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  async function enviar() {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      const r = await apiFetch(`/chats/${chat.id}/mensagens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: texto.trim() }),
      });
      const d = await r.json();
      if (r.ok) { setMensagens(prev => [...prev, d.mensagem]); setTexto(""); }
    } catch {}
    finally { setEnviando(false); }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "var(--surface)", borderRadius: 16,
        width: "min(460px, 95vw)", height: "min(540px, 90vh)",
        display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        border: "1px solid var(--border)",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
              💬 {chat.produto_nome}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              {usuarioId === chat.vendedor_id
                ? `Comprador: ${chat.comprador_nome}`
                : `Vendedor: ${chat.vendedor_nome}`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Mensagens */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
          {carregando ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "var(--muted)", fontSize: 13 }}>
              Carregando mensagens...
            </div>
          ) : mensagens.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, marginTop: 40 }}>
              Nenhuma mensagem ainda.
            </div>
          ) : (
            mensagens.map((msg, i) => {
              const minha = msg.remetente_id === usuarioId;
              return (
                <div key={i} style={{ display: "flex", justifyContent: minha ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "74%",
                    background: minha ? "var(--accent)" : "var(--surface2)",
                    color: minha ? "#fff" : "var(--text)",
                    borderRadius: minha ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    padding: "8px 12px", fontSize: 13, lineHeight: 1.4,
                  }}>
                    {!minha && (
                      <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 3, color: "var(--accent)" }}>
                        {msg.remetente_nome}
                      </div>
                    )}
                    {msg.texto}
                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 3, textAlign: "right" }}>
                      {new Date(msg.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Digite sua mensagem..."
            rows={2}
            style={{
              flex: 1, resize: "none", borderRadius: 10,
              border: "1px solid var(--border)", padding: "8px 12px",
              fontSize: 13, background: "var(--surface2)", color: "var(--text)",
              fontFamily: "inherit", outline: "none",
            }}
          />
          <button
            onClick={enviar}
            disabled={enviando || !texto.trim()}
            style={{
              background: "var(--accent)", border: "none", borderRadius: 10,
              padding: "0 16px", color: "#fff", cursor: "pointer",
              fontWeight: 700, fontSize: 13,
              opacity: enviando || !texto.trim() ? 0.5 : 1,
            }}
          >
            {enviando ? "..." : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Seção de Mensagens na Sidebar ───────────────────────────
function SidebarMensagens({ usuarioId }) {
  const [chats, setChats]         = useState([]);
  const [aberto, setAberto]       = useState(false);
  const [chatAtivo, setChatAtivo] = useState(null);

  const buscarChats = useCallback(async () => {
    try {
      const r = await apiFetch("/chats");
      const d = await r.json();
      if (r.ok) setChats(d.chats || []);
    } catch {}
  }, []);

  // Busca inicial e polling a cada 10s
  useEffect(() => {
    buscarChats();
    const t = setInterval(buscarChats, 10000);
    return () => clearInterval(t);
  }, [buscarChats]);

  // Conta chats com mensagens (pelo menos 1 mensagem)
  const comMensagens = chats.filter(c => c.ultima_mensagem);
  const total = comMensagens.length;

  if (!usuarioId) return null;

  return (
    <>
      {/* Item de mensagens na sidebar */}
      <div style={{ margin: "4px 0" }}>
        <button
          className="nav-item"
          onClick={() => setAberto(v => !v)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="nav-icon"><FaCommentDots /></span>
            Mensagens
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {total > 0 && (
              <span style={{
                background: "#ef4444", color: "#fff",
                fontSize: 10, fontWeight: 700, borderRadius: 10,
                padding: "1px 6px", minWidth: 18, textAlign: "center",
              }}>
                {total}
              </span>
            )}
            <span style={{ fontSize: 10, color: "var(--muted)", transition: "transform 0.2s", display: "inline-block", transform: aberto ? "rotate(90deg)" : "none" }}>
              ▶
            </span>
          </span>
        </button>

        {/* Lista de conversas expansível */}
        {aberto && (
          <div style={{
            margin: "4px 8px 8px 8px",
            background: "var(--surface2)",
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid var(--border)",
          }}>
            {comMensagens.length === 0 ? (
              <div style={{ padding: "12px 14px", fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
                Nenhuma conversa ainda.
              </div>
            ) : (
              comMensagens.map(chat => {
                const souVendedor = chat.vendedor_id === usuarioId;
                const outraPessoa = souVendedor ? chat.comprador_nome : chat.vendedor_nome;
                return (
                  <button
                    key={chat.id}
                    onClick={() => { setChatAtivo(chat); }}
                    style={{
                      width: "100%", background: "none", border: "none",
                      borderBottom: "1px solid var(--border)", cursor: "pointer",
                      padding: "10px 12px", textAlign: "left",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface)"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        background: "linear-gradient(135deg, var(--accent), #a855f7)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, color: "#fff",
                      }}>
                        {outraPessoa ? outraPessoa[0].toUpperCase() : "?"}
                      </div>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {outraPessoa}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          📦 {chat.produto_nome}
                        </div>
                        {chat.ultima_mensagem && (
                          <div style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1, fontStyle: "italic" }}>
                            {chat.ultima_mensagem}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modal do chat ativo */}
      {chatAtivo && (
        <ModalChatLayout
          chat={chatAtivo}
          usuarioId={usuarioId}
          onClose={() => { setChatAtivo(null); buscarChats(); }}
        />
      )}
    </>
  );
}

// ─── AppLayout principal ──────────────────────────────────────
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

          {/* ── Mensagens na sidebar ── */}
          <div className="nav-section-title" style={{ marginTop: 16 }}>Conversas</div>
          <SidebarMensagens usuarioId={usuario?.id} />
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
          <div className="topbar-actions">
            {usuario && (
              <div
                style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)", cursor: "pointer" }}
                onClick={() => navigate("/perfil")}
              >
                <Avatar fotoUrl={usuario.foto_url} initials={initials} size={28} fontSize={11} />
                <span style={{ fontSize: 13 }}>{usuario.nome}</span>
              </div>
            )}
          </div>
        </header>

        <main className="page-body">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;