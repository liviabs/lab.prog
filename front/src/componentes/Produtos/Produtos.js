import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaPlus, FaSearch, FaEdit, FaTrash, FaTh, FaList,
  FaTimes, FaBoxOpen, FaStore, FaBox, FaChevronLeft, FaChevronRight,
  FaCloudUploadAlt, FaChevronDown, FaChevronUp
} from "react-icons/fa";
import AppLayout from "../../AppLayout";
import { useToast } from "../../ToastContext";
import { apiFetch } from "../../api";

const ICONES = {
  roupas: "👕", moveis: "🛋️", automoveis: "🚗", sapatos: "👟",
  animais: "🐾", eletronicos: "💻", eletrodomesticos: "🏠", esportes: "🚴",
  comida: "🍔", outros: "📦",
};

const BADGE_CAT = {
  roupas: "badge-pink", moveis: "badge-blue", automoveis: "badge-orange",
  sapatos: "badge-pink", animais: "badge-green", eletronicos: "badge-blue",
  eletrodomesticos: "badge-gray", esportes: "badge-green",
  comida: "badge-orange", outros: "badge-gray",
};

const CATEGORIAS_DISPONIVEIS = [
  "roupas", "moveis", "automoveis", "sapatos",
  "animais", "eletronicos", "eletrodomesticos", "esportes",
  "comida", "outros",
];

const PRODUTO_VAZIO = {
  nome: "", descricao: "", preco: "", estoque: "", categoria: "",
  imagens: [],
};

const MAX_FILE_SIZE_MB = 5;
const MAX_IMAGES = 6;
const RESIZE_MAX_PX = 900;

// ─── Helpers de imagem ─────────────────────────────────────────

function parsearImagens(imagem_url) {
  if (!imagem_url) return [];
  try {
    const parsed = JSON.parse(imagem_url);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}
  return imagem_url ? [imagem_url] : [];
}

function redimensionarImagem(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > RESIZE_MAX_PX || height > RESIZE_MAX_PX) {
          if (width > height) { height = Math.round((height * RESIZE_MAX_PX) / width); width = RESIZE_MAX_PX; }
          else { width = Math.round((width * RESIZE_MAX_PX) / height); height = RESIZE_MAX_PX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── Carrossel de Imagens ──────────────────────────────────────
function Carrossel({ imagens, fallback, altura = "100%", estilo = {} }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => { setIdx(0); }, [imagens]);

  if (!imagens || imagens.length === 0) {
    return (
      <div style={{ width: "100%", height: altura, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, ...estilo }}>
        {fallback}
      </div>
    );
  }

  const prev = (e) => { e.stopPropagation(); setIdx(i => (i - 1 + imagens.length) % imagens.length); };
  const next = (e) => { e.stopPropagation(); setIdx(i => (i + 1) % imagens.length); };

  return (
    <div style={{ position: "relative", width: "100%", height: altura, overflow: "hidden", userSelect: "none", ...estilo }}>
      <img
        src={imagens[idx]}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
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

// ─── Upload de Fotos ──────────────────────────────────────────
function UploadFotos({ imagens, onChange }) {
  const inputRef = useRef(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");

  async function handleFiles(e) {
    const arquivos = Array.from(e.target.files);
    if (!arquivos.length) return;
    const slots = MAX_IMAGES - imagens.length;
    if (slots <= 0) { setErro(`Máximo de ${MAX_IMAGES} fotos atingido.`); return; }
    const selecionados = arquivos.slice(0, slots);
    const grandes = selecionados.filter(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    if (grandes.length) { setErro(`Arquivos muito grandes (máx. ${MAX_FILE_SIZE_MB}MB por foto).`); return; }
    setErro("");
    setProcessando(true);
    try {
      const novos = await Promise.all(selecionados.map(redimensionarImagem));
      onChange([...imagens, ...novos]);
    } catch { setErro("Erro ao processar imagem. Tente outro arquivo."); }
    finally { setProcessando(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  function remover(i) { onChange(imagens.filter((_, idx) => idx !== i)); }
  function mover(de, para) {
    const arr = [...imagens];
    const [item] = arr.splice(de, 1);
    arr.splice(para, 0, item);
    onChange(arr);
  }

  return (
    <div>
      {imagens.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {imagens.map((src, i) => (
            <div key={i} style={{ position: "relative", width: 72, height: 72, borderRadius: 8, overflow: "hidden", border: i === 0 ? "2px solid var(--accent)" : "2px solid var(--border)", flexShrink: 0 }}>
              <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {i === 0 && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "var(--accent)", color: "#fff", fontSize: 9, textAlign: "center", fontWeight: 700, padding: "2px 0" }}>CAPA</div>
              )}
              <button onClick={() => remover(i)} style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer", padding: 0, fontSize: 9 }}>
                <FaTimes />
              </button>
              {i > 0 && (
                <button onClick={() => mover(i, i - 1)} style={{ position: "absolute", top: 2, left: 2, background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer", padding: 0, fontSize: 9 }}>
                  <FaChevronLeft />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {imagens.length < MAX_IMAGES && (
        <div onClick={() => inputRef.current?.click()} style={{ border: "2px dashed var(--border)", borderRadius: 10, padding: "18px 12px", textAlign: "center", cursor: "pointer", background: "var(--surface2)", transition: "border-color 0.2s" }} onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
          {processando ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--muted)", fontSize: 13 }}>
              <span className="spinner" /> Processando fotos...
            </div>
          ) : (
            <>
              <FaCloudUploadAlt style={{ fontSize: 26, color: "var(--accent)", marginBottom: 6 }} />
              <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>Clique para adicionar fotos</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>
                JPG, PNG, WEBP · máx. {MAX_FILE_SIZE_MB}MB por foto · até {MAX_IMAGES} fotos
                {imagens.length > 0 && ` · ${MAX_IMAGES - imagens.length} restante(s)`}
              </div>
            </>
          )}
        </div>
      )}
      {erro && <div style={{ color: "var(--error)", fontSize: 12, marginTop: 6 }}>{erro}</div>}
      {imagens.length > 1 && (
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
          💡 A primeira foto será a capa do anúncio. Use as setas ‹ › para reordenar.
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFiles} />
    </div>
  );
}

// ─── Modal Produto ────────────────────────────────────────────
function ModalProduto({ produto, onClose, onSalvo, toast }) {
  const [form, setForm] = useState(() => ({
    ...(produto || PRODUTO_VAZIO),
    imagens: parsearImagens(produto?.imagem_url),
  }));
  const [erros, setErros] = useState({});
  const [carregando, setCarregando] = useState(false);
  const editando = !!produto?.id;

  function set(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }));
    setErros(e => ({ ...e, [campo]: "" }));
  }

  function validar() {
    const e = {};
    if (!form.nome.trim()) e.nome = "Nome é obrigatório.";
    if (!form.categoria) e.categoria = "Selecione uma categoria.";
    if (!form.preco || isNaN(Number(form.preco)) || Number(form.preco) < 0) e.preco = "Preço inválido.";
    if (!form.estoque || isNaN(Number(form.estoque)) || Number(form.estoque) < 0) e.estoque = "Estoque inválido.";
    return e;
  }

  async function salvar(e) {
    e.preventDefault();
    const errosVal = validar();
    if (Object.keys(errosVal).length) { setErros(errosVal); return; }
    setCarregando(true);
    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      preco: Number(form.preco),
      estoque: Number(form.estoque),
      categoria: form.categoria,
      imagem_url: form.imagens.length > 0 ? JSON.stringify(form.imagens) : "",
    };
    try {
      const path = editando ? `/produtos/${produto.id}` : `/produtos`;
      const method = editando ? "PUT" : "POST";
      const r = await apiFetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (r.ok) { toast(editando ? "Produto atualizado!" : "Produto publicado à venda!", "success"); onSalvo(); onClose(); }
      else toast(d.mensagem || "Erro ao salvar.", "error");
    } catch { toast("Erro de conexão.", "error"); }
    finally { setCarregando(false); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <span className="modal-title">{editando ? "Editar Produto" : "📦 Publicar Produto à Venda"}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={salvar}>
          <div className="modal-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="field" style={{ gridColumn: "1/-1" }}>
                <label>Fotos do produto</label>
                <UploadFotos imagens={form.imagens} onChange={(imgs) => setForm(f => ({ ...f, imagens: imgs }))} />
              </div>
              <div className="field" style={{ gridColumn: "1/-1" }}>
                <label>Nome *</label>
                <input type="text" placeholder="Nome do produto" value={form.nome} onChange={e => set("nome", e.target.value)} />
                {erros.nome && <small style={{ color: "var(--error)", fontSize: 12 }}>{erros.nome}</small>}
              </div>
              <div className="field">
                <label>Categoria *</label>
                <select value={form.categoria} onChange={e => set("categoria", e.target.value)}>
                  <option value="">Selecione...</option>
                  {CATEGORIAS_DISPONIVEIS.map(c => (
                    <option key={c} value={c}>{ICONES[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
                {erros.categoria && <small style={{ color: "var(--error)", fontSize: 12 }}>{erros.categoria}</small>}
              </div>
              <div className="field">
                <label>Preço (R$) *</label>
                <input type="number" step="0.01" min="0" placeholder="0,00" value={form.preco} onChange={e => set("preco", e.target.value)} />
                {erros.preco && <small style={{ color: "var(--error)", fontSize: 12 }}>{erros.preco}</small>}
              </div>
              <div className="field">
                <label>Quantidade em estoque *</label>
                <input type="number" min="0" placeholder="0" value={form.estoque} onChange={e => set("estoque", e.target.value)} />
                {erros.estoque && <small style={{ color: "var(--error)", fontSize: 12 }}>{erros.estoque}</small>}
              </div>
              <div className="field" style={{ gridColumn: "1/-1" }}>
                <label>Descrição</label>
                <textarea placeholder="Descreva o produto para os compradores..." value={form.descricao} onChange={e => set("descricao", e.target.value)} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={carregando} style={{ width: "auto" }}>
              {carregando ? <><span className="spinner" /> Salvando...</> : editando ? "Salvar alterações" : "Publicar à venda"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Deletar ─────────────────────────────────────────────
function ModalDeletar({ produto, onClose, onDeletado, toast }) {
  const [carregando, setCarregando] = useState(false);

  async function deletar() {
    setCarregando(true);
    try {
      const r = await apiFetch(`/produtos/${produto.id}`, { method: "DELETE" });
      if (r.ok) { toast("Anúncio removido.", "success"); onDeletado(); onClose(); }
      else { const d = await r.json(); toast(d.mensagem || "Erro ao deletar.", "error"); }
    } catch { toast("Erro de conexão.", "error"); }
    finally { setCarregando(false); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title">Remover Anúncio</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ textAlign: "center", padding: "32px 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
          <p style={{ color: "var(--text)", marginBottom: 6, fontWeight: 600 }}>Remover anúncio?</p>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            O produto <strong style={{ color: "var(--text)" }}>{produto.nome}</strong> será removido do marketplace.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger" onClick={deletar} disabled={carregando} style={{ width: "auto" }}>
            {carregando ? <><span className="spinner" style={{ borderTopColor: "var(--error)" }} /> Removendo...</> : "Sim, remover"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card Vendedor (clicável → perfil público) ─────────────────
function VendedorBadge({ nome, foto, usuarioId, onClick }) {
  const initials = nome ? nome.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
      style={{
        display: "flex", alignItems: "center", gap: 6, marginTop: 6,
        cursor: onClick ? "pointer" : "default",
        width: "fit-content",
      }}
      title={onClick ? `Ver perfil de ${nome}` : undefined}
    >
      <div style={{
        width: 22, height: 22, borderRadius: "50%",
        background: "linear-gradient(135deg, var(--accent), #a855f7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0, overflow: "hidden",
        border: onClick ? "1.5px solid var(--accent)" : "none",
        transition: "opacity 0.15s",
      }}>
        {foto
          ? <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
          : initials
        }
      </div>
      <span style={{
        fontSize: 11, color: "var(--accent)",
        textDecoration: onClick ? "underline" : "none",
        textDecorationStyle: "dotted",
        fontWeight: onClick ? 600 : 400,
      }}>
        {nome || "Vendedor"}
      </span>
    </div>
  );
}

// ─── Descrição expansível ──────────────────────────────────────
function DescricaoExpansivel({ descricao, expandido, onToggle }) {
  if (!descricao) return (
    <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic", opacity: 0.5, marginBottom: 6 }}>
      Sem descrição.
    </div>
  );

  return (
    <div style={{ marginBottom: 6 }}>
      {/* Texto sempre aparece, mas colapsado mostra só uma linha e esmaecido */}
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

      {/* Botão de expansão */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        style={{
          display: "flex", alignItems: "center", gap: 3,
          background: "none", border: "none", padding: "2px 0",
          color: "var(--accent)", fontSize: 11, cursor: "pointer",
          fontWeight: 600, marginTop: 2,
        }}
      >
        {expandido ? <><FaChevronUp style={{ fontSize: 9 }} /> Ocultar</> : <><FaChevronDown style={{ fontSize: 9 }} /> Ver detalhes</>}
      </button>
    </div>
  );
}

// ─── Componente Principal ──────────────────────────────────────
function Produtos() {
  const [produtos, setProdutos]         = useState([]);
  const [usuarioId, setUsuarioId]       = useState(null);
  const [categorias, setCategorias]     = useState([]);
  const [categoriaSel, setCategoriaSel] = useState([]);
  const [busca, setBusca]               = useState("");
  const [carregando, setCarregando]     = useState(true);
  const [view, setView]                 = useState("grid");
  const [modalNovo, setModalNovo]       = useState(false);
  const [editando, setEditando]         = useState(null);
  const [deletando, setDeletando]       = useState(null);
  // Set de IDs de cards com descrição expandida
  const [expandidos, setExpandidos]     = useState(new Set());

  const navigate = useNavigate();
  const location = useLocation();
  const toast    = useToast();

  const meus = new URLSearchParams(location.search).get("meus") === "1";

  function toggleExpandido(id) {
    setExpandidos(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  useEffect(() => {
    apiFetch("/verificar")
      .then(r => r.json())
      .then(d => { if (d.logado) setUsuarioId(d.usuario.id); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("novo") === "1") {
      setModalNovo(true);
      navigate(meus ? "/produtos?meus=1" : "/produtos", { replace: true });
    }
  }, [location.search]);

  useEffect(() => {
    apiFetch("/categorias")
      .then(r => r.json())
      .then(d => setCategorias(d.categorias || []))
      .catch(() => {});
  }, []);

  const buscarProdutos = useCallback(() => {
    setCarregando(true);
    const params = new URLSearchParams();
    if (meus) params.append("meus", "1");
    if (categoriaSel.length > 0) params.append("categorias", categoriaSel.join(","));
    if (busca) params.append("busca", busca);
    apiFetch(`/produtos?${params}`)
      .then(r => r.json())
      .then(d => setProdutos(d.produtos || []))
      .catch(() => setProdutos([]))
      .finally(() => setCarregando(false));
  }, [categoriaSel, busca, meus]);

  useEffect(() => {
    const t = setTimeout(buscarProdutos, 300);
    return () => clearTimeout(t);
  }, [buscarProdutos]);

  useEffect(() => {
    setCategoriaSel([]);
    setBusca("");
    setExpandidos(new Set());
  }, [meus]);

  function toggleCat(cat) {
    setCategoriaSel(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  }

  function fmtPreco(v) {
    return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function ehMeuProduto(p) {
    return usuarioId && p.usuario_id === usuarioId;
  }

  function irParaVendedor(p) {
    navigate(`/vendedor/${p.usuario_id}`);
  }

  const titulo    = meus ? "Meus Produtos" : "Marketplace";
  const subtitulo = meus ? "Produtos que você está vendendo" : "Todos os produtos disponíveis para compra";

  return (
    <AppLayout title={titulo}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button className={`btn ${!meus ? "btn-primary" : "btn-ghost"}`} style={{ width: "auto" }} onClick={() => navigate("/produtos")}>
          <FaStore /> Marketplace
        </button>
        <button className={`btn ${meus ? "btn-primary" : "btn-ghost"}`} style={{ width: "auto" }} onClick={() => navigate("/produtos?meus=1")}>
          <FaBox /> Meus Produtos
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>{subtitulo}</div>
      </div>

      {/* Barra de filtros */}
      <div className="section-header">
        <div className="topbar-search" style={{ width: 280 }}>
          <FaSearch className="search-icon" />
          <input
            placeholder="Buscar produto..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          {busca && (
            <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0 }} onClick={() => setBusca("")}>
              <FaTimes style={{ fontSize: 12 }} />
            </button>
          )}
        </div>
        <div className="section-actions">
          <div className="view-toggle">
            <button className={`view-btn ${view === "grid" ? "active" : ""}`} onClick={() => setView("grid")} title="Grade"><FaTh /></button>
            <button className={`view-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")} title="Lista"><FaList /></button>
          </div>
          <button className="btn btn-primary" style={{ width: "auto" }} onClick={() => setModalNovo(true)}>
            <FaPlus /> {meus ? "Novo Anúncio" : "Vender Produto"}
          </button>
        </div>
      </div>

      {/* Chips de categoria */}
      {categorias.length > 0 && (
        <div className="filter-bar">
          <div className={`chip ${categoriaSel.length === 0 ? "active" : ""}`} onClick={() => setCategoriaSel([])}>
            Todos
          </div>
          {categorias.map(cat => (
            <div key={cat} className={`chip ${categoriaSel.includes(cat) ? "active" : ""}`} onClick={() => toggleCat(cat)}>
              {ICONES[cat] || "📦"} {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </div>
          ))}
        </div>
      )}

      {/* Conteúdo */}
      {carregando ? (
        <div className="empty-state">
          <div className="big-spinner" style={{ width: 36, height: 36, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
          <span style={{ color: "var(--muted)", fontSize: 14 }}>Carregando...</span>
        </div>
      ) : produtos.length === 0 ? (
        <div className="empty-state">
          <FaBoxOpen className="empty-icon" />
          <div className="empty-title">
            {meus ? "Você ainda não tem produtos à venda" : "Nenhum produto encontrado"}
          </div>
          <div className="empty-sub">
            {busca || categoriaSel.length > 0
              ? "Tente outros filtros."
              : meus
                ? "Clique em \"Novo Anúncio\" para começar a vender!"
                : "Seja o primeiro a publicar um produto."}
          </div>
          {meus && (
            <button className="btn btn-primary" style={{ width: "auto", marginTop: 16 }} onClick={() => setModalNovo(true)}>
              <FaPlus /> Publicar meu primeiro produto
            </button>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="prod-grid">
          {produtos.map(p => {
            const meu      = ehMeuProduto(p);
            const imagens  = parsearImagens(p.imagem_url);
            const expanded = expandidos.has(p.id);
            return (
              <div key={p.id} className="prod-card" style={meu ? { outline: "2px solid var(--accent)", outlineOffset: 2 } : {}}>
                {meu && (
                  <div style={{ position: "absolute", top: 8, right: 8, background: "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "2px 6px", zIndex: 3 }}>
                    SEU
                  </div>
                )}

                {/* Clique na imagem → perfil do vendedor (se não for produto seu) */}
                <div
                  className="prod-thumb"
                  style={{ padding: 0, overflow: "hidden", cursor: !meu ? "pointer" : "default" }}
                  onClick={() => { if (!meu) irParaVendedor(p); }}
                  title={!meu ? `Ver perfil de ${p.vendedor_nome}` : undefined}
                >
                  <Carrossel imagens={imagens} fallback={ICONES[p.categoria] || "📦"} altura="100%" />
                </div>

                <div className="prod-body">
                  <div className="prod-cat">{ICONES[p.categoria] || "📦"} {p.categoria}</div>
                  <div className="prod-name">{p.nome}</div>

                  {/* Descrição expansível */}
                  <DescricaoExpansivel
                    descricao={p.descricao}
                    expandido={expanded}
                    onToggle={() => toggleExpandido(p.id)}
                  />

                  {/* Vendedor como link (só no marketplace) */}
                  {!meus && (
                    <VendedorBadge
                      nome={p.vendedor_nome}
                      foto={p.vendedor_foto}
                      usuarioId={p.usuario_id}
                      onClick={!meu ? () => irParaVendedor(p) : null}
                    />
                  )}

                  <div className="prod-foot">
                    <span className="prod-price">{fmtPreco(p.preco)}</span>
                    <span className={`badge ${p.estoque > 0 ? "badge-green" : "badge-red"}`}>
                      {p.estoque > 0 ? `${p.estoque} un.` : "Indisponível"}
                    </span>
                  </div>
                </div>

                {meu ? (
                  <div className="prod-card-actions">
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setEditando(p)}><FaEdit /> Editar</button>
                    <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => setDeletando(p)}><FaTrash /> Remover</button>
                  </div>
                ) : (
                  <div className="prod-card-actions">
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }}>🛒 Comprar</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // Vista de lista (tabela)
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Estoque</th>
                {!meus && <th>Vendedor</th>}
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map(p => {
                const meu      = ehMeuProduto(p);
                const imagens  = parsearImagens(p.imagem_url);
                const expanded = expandidos.has(p.id);
                return (
                  <tr key={p.id} style={meu ? { background: "rgba(99,102,241,0.04)" } : {}}>
                    <td>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        {/* Thumbnail clicável → perfil vendedor */}
                        <div
                          style={{ width: 42, height: 42, borderRadius: 8, flexShrink: 0, overflow: "hidden", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: !meu ? "pointer" : "default" }}
                          onClick={() => { if (!meu) irParaVendedor(p); }}
                          title={!meu ? `Ver perfil de ${p.vendedor_nome}` : undefined}
                        >
                          <Carrossel imagens={imagens} fallback={ICONES[p.categoria] || "📦"} altura="42px" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {p.nome}
                            {meu && <span style={{ marginLeft: 6, fontSize: 10, background: "var(--accent)", color: "#fff", borderRadius: 3, padding: "1px 5px" }}>SEU</span>}
                          </div>
                          {/* Descrição expansível na lista */}
                          <DescricaoExpansivel
                            descricao={p.descricao}
                            expandido={expanded}
                            onToggle={() => toggleExpandido(p.id)}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${BADGE_CAT[p.categoria] || "badge-gray"}`}>
                        {ICONES[p.categoria] || "📦"} {p.categoria}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--accent)", fontFamily: "'DM Serif Display', serif" }}>{fmtPreco(p.preco)}</td>
                    <td>{p.estoque}</td>
                    {!meus && (
                      <td>
                        <VendedorBadge
                          nome={p.vendedor_nome}
                          foto={p.vendedor_foto}
                          usuarioId={p.usuario_id}
                          onClick={!meu ? () => irParaVendedor(p) : null}
                        />
                      </td>
                    )}
                    <td>
                      <span className={`badge ${p.estoque > 0 ? "badge-green" : "badge-red"}`}>
                        {p.estoque > 0 ? "Disponível" : "Indisponível"}
                      </span>
                    </td>
                    <td>
                      {meu ? (
                        <div className="table-actions">
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditando(p)} title="Editar"><FaEdit /></button>
                          <button className="btn btn-danger btn-sm btn-icon" onClick={() => setDeletando(p)} title="Remover"><FaTrash /></button>
                        </div>
                      ) : (
                        <button className="btn btn-primary btn-sm" style={{ width: "auto" }}>🛒 Comprar</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modais */}
      {modalNovo && <ModalProduto produto={null} onClose={() => setModalNovo(false)} onSalvo={buscarProdutos} toast={toast} />}
      {editando  && <ModalProduto produto={editando} onClose={() => setEditando(null)} onSalvo={buscarProdutos} toast={toast} />}
      {deletando && <ModalDeletar produto={deletando} onClose={() => setDeletando(null)} onDeletado={buscarProdutos} toast={toast} />}
    </AppLayout>
  );
}

export default Produtos;