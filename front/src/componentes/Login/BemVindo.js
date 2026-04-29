import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBox, FaShoppingCart, FaExclamationTriangle, FaChartBar, FaStore, FaUser } from "react-icons/fa";
import AppLayout from "../../AppLayout";
import { apiFetch } from "../../api";

function BemVindo() {
  const [usuario, setUsuario] = useState(null);
  const [statsAll, setStatsAll]   = useState({ total: 0, categorias: 0 });
  const [statsMeus, setStatsMeus] = useState({ total: 0, semEstoque: 0, totalValor: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch("/verificar")
      .then(r => r.json())
      .then(d => { if (d.logado) setUsuario(d.usuario); })
      .catch(() => {});

    apiFetch("/produtos")
      .then(r => r.json())
      .then(d => {
        const produtos = d.produtos || [];
        const categorias = new Set(produtos.map(p => p.categoria)).size;
        setStatsAll({ total: produtos.length, categorias });
      })
      .catch(() => {});

    apiFetch("/produtos?meus=1")
      .then(r => r.json())
      .then(d => {
        const produtos = d.produtos || [];
        const semEstoque = produtos.filter(p => p.estoque <= 0).length;
        const totalValor = produtos.reduce((s, p) => s + Number(p.preco) * p.estoque, 0);
        setStatsMeus({ total: produtos.length, semEstoque, totalValor });
      })
      .catch(() => {});
  }, []);

  const fmt = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <AppLayout title="Dashboard">
      {/* Hero */}
      <div className="welcome-hero">
        {usuario && (
          <>
            <div className="welcome-avatar">
              {/* ✅ usa foto_url, igual ao Perfil.jsx */}
              {usuario.foto_url
                ? (
                  <img
                    src={usuario.foto_url}
                    alt={usuario.nome}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                  />
                )
                : usuario.nome.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
              }
            </div>
            <div>
              <div className="welcome-name">{saudacao}, {usuario.nome.split(" ")[0]}! 👋</div>
              <div className="welcome-sub">Compre e venda produtos no StoreApp Marketplace.</div>
            </div>
          </>
        )}
      </div>

      {/* Stats Marketplace */}
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)", marginBottom: 10, marginTop: 4 }}>
        🛒 Marketplace
      </div>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon blue"><FaStore /></div>
          <div>
            <div className="stat-label">Produtos à Venda</div>
            <div className="stat-value">{statsAll.total}</div>
            <div className="stat-sub">no marketplace</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pink"><FaChartBar /></div>
          <div>
            <div className="stat-label">Categorias</div>
            <div className="stat-value">{statsAll.categorias}</div>
            <div className="stat-sub">disponíveis</div>
          </div>
        </div>
      </div>

      {/* Stats Meus */}
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted)", marginBottom: 10 }}>
        📦 Meus Produtos
      </div>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon green"><FaBox /></div>
          <div>
            <div className="stat-label">Anunciados</div>
            <div className="stat-value">{statsMeus.total}</div>
            <div className="stat-sub">produtos à venda</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FaShoppingCart /></div>
          <div>
            <div className="stat-label">Valor em Estoque</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{fmt(statsMeus.totalValor)}</div>
            <div className="stat-sub">estimado</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><FaExclamationTriangle /></div>
          <div>
            <div className="stat-label">Sem Estoque</div>
            <div className="stat-value">{statsMeus.semEstoque}</div>
            <div className="stat-sub">produtos indisponíveis</div>
          </div>
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="section-header">
        <h2 className="section-title">Ações rápidas</h2>
      </div>
      <div className="quick-actions">
        <div className="quick-card" onClick={() => navigate("/produtos")}>
          <span className="quick-card-icon">🛍️</span>
          <div>
            <div className="quick-card-label">Ver Marketplace</div>
            <div className="quick-card-sub">Comprar produtos disponíveis</div>
          </div>
        </div>
        <div className="quick-card" onClick={() => navigate("/produtos?meus=1")}>
          <span className="quick-card-icon">📦</span>
          <div>
            <div className="quick-card-label">Meus Produtos</div>
            <div className="quick-card-sub">Gerenciar anúncios</div>
          </div>
        </div>
        <div className="quick-card" onClick={() => navigate("/produtos?novo=1")}>
          <span className="quick-card-icon">➕</span>
          <div>
            <div className="quick-card-label">Vender Produto</div>
            <div className="quick-card-sub">Publicar novo anúncio</div>
          </div>
        </div>
        <div className="quick-card" onClick={() => navigate("/perfil")}>
          <span className="quick-card-icon">👤</span>
          <div>
            <div className="quick-card-label">Meu Perfil</div>
            <div className="quick-card-sub">Configurar conta</div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default BemVindo;