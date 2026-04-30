import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaUser, FaEnvelope, FaPhone, FaCheckCircle, FaArrowLeft,
  FaStore, FaChevronLeft, FaChevronRight, FaBoxOpen,
  FaChevronDown, FaChevronUp  // ← adicionados
} from "react-icons/fa";
import AppLayout from "../../AppLayout";
import { apiFetch } from "../../api";

const ICONES = {
  roupas: "👕", moveis: "🛋️", automoveis: "🚗", sapatos: "👟",
  animais: "🐾", eletronicos: "💻", eletrodomesticos: "🏠", esportes: "🚴",
  comida: "🍔", outros: "📦",
};

function parsearImagens(imagem_url) {
  if (!imagem_url) return [];
  try {
    const parsed = JSON.parse(imagem_url);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}
  return imagem_url ? [imagem_url] : [];
}

function fmtPreco(v) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Carrossel({ imagens, fallback, altura = "100%" }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [imagens]);

  if (!imagens || imagens.length === 0) {
    return (
      <div style={{ width: "100%", height: altura, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
        {fallback}
      </div>
    );
  }

  const prev = (e) => { e.stopPropagation(); setIdx(i => (i - 1 + imagens.length) % imagens.length); };
  const next = (e) => { e.stopPropagation(); setIdx(i => (i + 1) % imagens.length); };

  return (
    <div style={{ position: "relative", width: "100%", height: altura, overflow: "hidden", userSelect: "none" }}>
      <img src={imagens[idx]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      {imagens.length > 1 && (
        <>
          <button onClick={prev} style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer", padding: 0, fontSize: 11, zIndex: 2, backdropFilter: "blur(4px)" }}>
            <FaChevronLeft />
          </button>
          <button onClick={next} style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer", padding: 0, fontSize: 11, zIndex: 2, backdropFilter: "blur(4px)" }}>
            <FaChevronRight />
          </button>
          <div style={{ position: "absolute", bottom: 5, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4, zIndex: 2 }}>
            {imagens.map((_, i) => (
              <div key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }} style={{ width: i === idx ? 14 : 6, height: 6, borderRadius: 3, background: i === idx ? "#fff" : "rgba(255,255,255,0.5)", cursor: "pointer", transition: "all 0.2s" }} />
            ))}
          </div>
          <div style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, borderRadius: 10, padding: "2px 7px", backdropFilter: "blur(4px)", zIndex: 2 }}>
            {idx + 1}/{imagens.length}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Descrição expansível (idêntico ao Produtos.jsx) ──────────
function DescricaoExpansivel({ descricao, expandido, onToggle }) {
  if (!descricao) return (
    <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic", opacity: 0.5, marginBottom: 6 }}>
      Sem descrição.
    </div>
  );

  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{
        fontSize: 12,
        color: "var(--muted)",
        opacity: expandido ? 1 : 0.45,
        maxHeight: expandido ? 200 : "1.4em",
        overflow: "hidden",
        transition: "max-height 0.3s ease, opacity 0.3s ease",
        lineHeight: "1.4em",
        whiteSpace: expandido ? "pre-wrap" : "nowrap",
        textOverflow: expandido ? "unset" : "ellipsis",
      }}>
        {descricao}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        style={{
          display: "flex", alignItems: "center", gap: 3,
          background: "none", border: "none", padding: "2px 0",
          color: "var(--accent)", fontSize: 11, cursor: "pointer",
          fontWeight: 600, marginTop: 2,
        }}
      >
        {expandido
          ? <><FaChevronUp style={{ fontSize: 9 }} /> Ocultar</>
          : <><FaChevronDown style={{ fontSize: 9 }} /> Ver detalhes</>}
      </button>
    </div>
  );
}

// ─── Card de produto (idêntico ao marketplace) ────────────────
function CardProduto({ p, expandido, onToggle }) {
  const imagens = parsearImagens(p.imagem_url);
  return (
    <div className="prod-card">
      <div className="prod-thumb" style={{ padding: 0, overflow: "hidden" }}>
        <Carrossel imagens={imagens} fallback={ICONES[p.categoria] || "📦"} altura="100%" />
      </div>
      <div className="prod-body">
        <div className="prod-cat">{ICONES[p.categoria] || "📦"} {p.categoria}</div>
        <div className="prod-name">{p.nome}</div>

        {/* Descrição expansível */}
        <DescricaoExpansivel
          descricao={p.descricao}
          expandido={expandido}
          onToggle={onToggle}
        />

        <div className="prod-foot">
          <span className="prod-price">{fmtPreco(p.preco)}</span>
          <span className={`badge ${p.estoque > 0 ? "badge-green" : "badge-red"}`}>
            {p.estoque > 0 ? `${p.estoque} un.` : "Indisponível"}
          </span>
        </div>
      </div>
      <div className="prod-card-actions">
        <button className="btn btn-primary btn-sm" style={{ flex: 1 }}>🛒 Comprar</button>
      </div>
    </div>
  );
}

// ─── Página Perfil do Vendedor ────────────────────────────────
function PerfilVendedor() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [vendedor,   setVendedor]   = useState(null);
  const [produtos,   setProdutos]   = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro,       setErro]       = useState("");
  const [expandidos, setExpandidos] = useState(new Set()); // ← novo

  function toggleExpandido(id) {
    setExpandidos(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const rPerfil = await apiFetch(`/usuarios/${id}/perfil`);
      if (!rPerfil.ok) { setErro("Vendedor não encontrado."); setCarregando(false); return; }
      const dPerfil = await rPerfil.json();
      setVendedor(dPerfil.perfil || dPerfil.usuario || dPerfil);

      const rProd = await apiFetch(`/produtos?vendedor=${id}`);
      const dProd = await rProd.json();
      setProdutos(dProd.produtos || []);
    } catch {
      setErro("Erro ao carregar perfil do vendedor.");
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  const initials = vendedor?.nome
    ? vendedor.nome.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const membro = vendedor?.criado_em
    ? new Date(vendedor.criado_em).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : null;

  return (
    <AppLayout title="Perfil do Vendedor">
      <button className="btn btn-ghost" style={{ width: "auto", marginBottom: 20 }} onClick={() => navigate(-1)}>
        <FaArrowLeft /> Voltar
      </button>

      {carregando ? (
        <div className="empty-state">
          <div className="big-spinner" style={{ width: 36, height: 36, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
          <span style={{ color: "var(--muted)", fontSize: 14 }}>Carregando perfil...</span>
        </div>
      ) : erro ? (
        <div className="empty-state">
          <div style={{ fontSize: 48, marginBottom: 12 }}>😕</div>
          <div className="empty-title">{erro}</div>
          <button className="btn btn-ghost" style={{ width: "auto", marginTop: 16 }} onClick={() => navigate("/produtos")}>
            <FaStore /> Voltar ao Marketplace
          </button>
        </div>
      ) : vendedor ? (
        <>
          <div className="perfil-card" style={{ marginBottom: 28 }}>
            <div className="perfil-card-header">
              <span><FaUser style={{ marginRight: 8 }} />Sobre o Vendedor</span>
            </div>
            <div className="perfil-avatar-row">
              <div className="perfil-avatar-wrap">
                {vendedor.foto_url
                  ? <img src={vendedor.foto_url} alt="Foto" className="perfil-avatar-img" />
                  : <div className="perfil-avatar-initials">{initials}</div>}
              </div>
              <div>
                <div className="perfil-name">{vendedor.nome}</div>
                {membro && <div className="perfil-since">Membro desde {membro}</div>}
              </div>
            </div>
            <div className="perfil-info-list">
              {vendedor.email && (
                <div className="perfil-info-item">
                  <FaEnvelope className="perfil-info-icon" />
                  <div>
                    <div className="perfil-info-label">E-mail</div>
                    <div className="perfil-info-value">{vendedor.email}</div>
                  </div>
                </div>
              )}
              {vendedor.telefone && (
                <div className="perfil-info-item">
                  <FaPhone className="perfil-info-icon" />
                  <div>
                    <div className="perfil-info-label">Telefone</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div className="perfil-info-value">{vendedor.telefone}</div>
                      {vendedor.telefone_verificado && (
                        <span className="badge badge-green" style={{ fontSize: 10 }}>
                          <FaCheckCircle style={{ marginRight: 3 }} />Verificado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {vendedor.bio && (
                <div className="perfil-info-item">
                  <FaUser className="perfil-info-icon" />
                  <div>
                    <div className="perfil-info-label">Bio</div>
                    <div className="perfil-info-value" style={{ whiteSpace: "pre-wrap" }}>{vendedor.bio}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
              <FaStore style={{ color: "var(--accent)" }} />
              Anúncios de {vendedor.nome?.split(" ")[0]}
              <span style={{ fontSize: 13, fontWeight: 400, color: "var(--muted)" }}>
                ({produtos.length} {produtos.length === 1 ? "produto" : "produtos"})
              </span>
            </div>
          </div>

          {produtos.length === 0 ? (
            <div className="empty-state">
              <FaBoxOpen className="empty-icon" />
              <div className="empty-title">Nenhum produto à venda</div>
              <div className="empty-sub">Este vendedor ainda não tem anúncios ativos.</div>
            </div>
          ) : (
            <div className="prod-grid">
              {produtos.map(p => (
                <CardProduto
                  key={p.id}
                  p={p}
                  expandido={expandidos.has(p.id)}
                  onToggle={() => toggleExpandido(p.id)}
                />
              ))}
            </div>
          )}
        </>
      ) : null}
    </AppLayout>
  );
}

export default PerfilVendedor;