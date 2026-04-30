import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaPlus, FaSearch, FaEdit, FaTrash, FaTh, FaList,
  FaTimes, FaBoxOpen, FaStore, FaBox, FaChevronLeft, FaChevronRight,
  FaCloudUploadAlt, FaCommentDots, FaChevronDown,
} from "react-icons/fa";
import AppLayout from "../../AppLayout";
import { useToast } from "../../ToastContext";
import { apiFetch } from "../../api";

const ICONES = {
  roupas: "👕", moveis: "🛋️", automoveis: "🚗", sapatos: "👟",
  animais: "🐾", eletronicos: "💻", eletrodomesticos: "🏠", esportes: "🚴",
};

const BADGE_CAT = {
  roupas: "badge-pink", moveis: "badge-blue", automoveis: "badge-orange",
  sapatos: "badge-pink", animais: "badge-green", eletronicos: "badge-blue",
  eletrodomesticos: "badge-gray", esportes: "badge-green",
};

const CATEGORIAS_DISPONIVEIS = [
  "roupas", "moveis", "automoveis", "sapatos",
  "animais", "eletronicos", "eletrodomesticos", "esportes",
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

// ─── Upload de Fotos (dentro do modal) ────────────────────────
// CORREÇÃO 1: mover() apenas atualiza o estado local — não salva automaticamente.
// O salvamento só ocorre quando o usuário clica em "Salvar alterações" no formulário.
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
    } catch {
      setErro("Erro ao processar imagem. Tente outro arquivo.");
    } finally {
      setProcessando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remover(i) {
    onChange(imagens.filter((_, idx) => idx !== i));
  }

  // Apenas reordena localmente — NÃO dispara nenhum save/close
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
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "var(--accent)", color: "#fff", fontSize: 9, textAlign: "center", fontWeight: 700, padding: "2px 0" }}>
                  CAPA
                </div>
              )}
              <button type="button" onClick={(e) => { e.stopPropagation(); remover(i); }} style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer", padding: 0, fontSize: 9 }}>
                <FaTimes />
              </button>
              {i > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); mover(i, i - 1); }}
                  style={{ position: "absolute", top: 2, left: 2, background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer", padding: 0, fontSize: 9 }}
                >
                  <FaChevronLeft />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {imagens.length < MAX_IMAGES && (
        <div
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          style={{ border: "2px dashed var(--border)", borderRadius: 10, padding: "18px 12px", textAlign: "center", cursor: "pointer", background: "var(--surface2)", transition: "border-color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
        >
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
    if (!form.nome.trim())    e.nome      = "Nome é obrigatório.";
    if (!form.categoria)      e.categoria = "Selecione uma categoria.";
    if (!form.preco || isNaN(Number(form.preco)) || Number(form.preco) < 0) e.preco = "Preço inválido.";
    if (!form.estoque || isNaN(Number(form.estoque)) || Number(form.estoque) < 0) e.estoque = "Estoque inválido.";
    return e;
  }

  // Só salva quando o usuário clica em "Salvar alterações" / "Publicar à venda"
  async function salvar(e) {
    e.preventDefault();
    const errosVal = validar();
    if (Object.keys(errosVal).length) { setErros(errosVal); return; }
    setCarregando(true);

    const payload = {
      nome:       form.nome.trim(),
      descricao:  form.descricao.trim(),
      preco:      Number(form.preco),
      estoque:    Number(form.estoque),
      categoria:  form.categoria,
      imagem_url: form.imagens.length > 0 ? JSON.stringify(form.imagens) : "",
    };

    try {
      const path   = editando ? `/produtos/${produto.id}` : `/produtos`;
      const method = editando ? "PUT" : "POST";
      const r = await apiFetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (r.ok) {
        toast(editando ? "Produto atualizado!" : "Produto publicado à venda!", "success");
        onSalvo();
        onClose();
      } else {
        toast(d.mensagem || "Erro ao salvar.", "error");
      }
    } catch { toast("Erro de conexão.", "error"); }
    finally { setCarregando(false); }
  }

  return (
    <div className="modal-overlay">
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
                <UploadFotos
                  imagens={form.imagens}
                  onChange={(imgs) => setForm(f => ({ ...f, imagens: imgs }))}
                />
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
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
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

// ─── Modal Chat / Tenho Interesse ──────────────────────────────
function ModalChat({ produto, usuarioId, onClose, toast }) {
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto]         = useState("");
  const [enviando, setEnviando]   = useState(false);
  const [chatId, setChatId]       = useState(null);
  const [carregando, setCarregando] = useState(true);
  const bottomRef = useRef(null);

  // Abre ou recupera o chat ao montar
  useEffect(() => {
    async function iniciarChat() {
      try {
        const r = await apiFetch("/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ produto_id: produto.id }),
        });
        const d = await r.json();
        if (r.ok) {
          setChatId(d.chat.id);
          setMensagens(d.mensagens || []);
        } else {
          toast(d.mensagem || "Erro ao abrir chat.", "error");
          onClose();
        }
      } catch {
        toast("Erro de conexão.", "error");
        onClose();
      } finally {
        setCarregando(false);
      }
    }
    iniciarChat();
  }, [produto.id]);

  // Scroll para o fim sempre que chegarem novas mensagens
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  // Polling simples a cada 3 segundos
  useEffect(() => {
    if (!chatId) return;
    const interval = setInterval(async () => {
      try {
        const r = await apiFetch(`/chats/${chatId}/mensagens`);
        const d = await r.json();
        if (r.ok) setMensagens(d.mensagens || []);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [chatId]);

  async function enviar() {
    if (!texto.trim() || !chatId) return;
    setEnviando(true);
    try {
      const r = await apiFetch(`/chats/${chatId}/mensagens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: texto.trim() }),
      });
      const d = await r.json();
      if (r.ok) {
        setMensagens(prev => [...prev, d.mensagem]);
        setTexto("");
      } else {
        toast(d.mensagem || "Erro ao enviar.", "error");
      }
    } catch { toast("Erro de conexão.", "error"); }
    finally { setEnviando(false); }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480, display: "flex", flexDirection: "column", height: 520 }}>
        <div className="modal-header">
          <span className="modal-title">💬 Conversa sobre: {produto.nome}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Vendedor info */}
        <div style={{ padding: "8px 20px", borderBottom: "1px solid var(--border)", fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <span>Vendedor:</span>
          <strong style={{ color: "var(--text)" }}>{produto.vendedor_nome || "—"}</strong>
        </div>

        {/* Mensagens */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          {carregando ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
              <span className="spinner" /> &nbsp; Carregando...
            </div>
          ) : mensagens.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, marginTop: 40 }}>
              👋 Inicie a conversa! Pergunte sobre o produto.
            </div>
          ) : (
            mensagens.map((msg, i) => {
              const minha = msg.remetente_id === usuarioId;
              return (
                <div key={i} style={{ display: "flex", justifyContent: minha ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "72%",
                    background: minha ? "var(--accent)" : "var(--surface2)",
                    color: minha ? "#fff" : "var(--text)",
                    borderRadius: minha ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    padding: "8px 12px",
                    fontSize: 13,
                    lineHeight: 1.4,
                  }}>
                    {!minha && (
                      <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 3, color: "var(--accent)" }}>
                        {msg.remetente_nome}
                      </div>
                    )}
                    {msg.texto}
                    <div style={{ fontSize: 10, opacity: 0.65, marginTop: 3, textAlign: "right" }}>
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
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Digite sua mensagem..."
            rows={2}
            style={{
              flex: 1, resize: "none", borderRadius: 10, border: "1px solid var(--border)",
              padding: "8px 12px", fontSize: 13, background: "var(--surface2)", color: "var(--text)",
              fontFamily: "inherit", outline: "none",
            }}
          />
          <button
            onClick={enviar}
            disabled={enviando || !texto.trim()}
            style={{
              background: "var(--accent)", border: "none", borderRadius: 10,
              padding: "0 16px", color: "#fff", cursor: "pointer", fontWeight: 600,
              fontSize: 13, display: "flex", alignItems: "center", gap: 6,
              opacity: enviando || !texto.trim() ? 0.5 : 1,
            }}
          >
            {enviando ? <span className="spinner" /> : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Botão "Todos" com dropdown de categorias ──────────────────
// CORREÇÃO 2: "Todos" vira botão que abre dropdown com checkboxes de categoria + botão OK verde.
// Ao clicar em OK aplica o filtro. Para remover, clica no botão e desmarca tudo + OK.
function FiltroCategoria({ categorias, categoriaSel, onAplicar }) {
  const [aberto, setAberto]           = useState(false);
  const [selecionadas, setSelecionadas] = useState(categoriaSel);
  const ref = useRef(null);

  // Sincroniza quando o pai limpa filtros
  useEffect(() => { setSelecionadas(categoriaSel); }, [categoriaSel]);

  function toggle(cat) {
    setSelecionadas(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  }

  function aplicar() {
    onAplicar(selecionadas);
    setAberto(false);
  }

  function abrirDropdown() {
    setSelecionadas(categoriaSel); // reseta para o estado atual ao abrir
    setAberto(v => !v);
  }

  const temFiltro = categoriaSel.length > 0;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={abrirDropdown}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
          fontWeight: 600, fontSize: 13, transition: "all 0.2s",
          background: temFiltro ? "var(--accent)" : "var(--surface2)",
          color: temFiltro ? "#fff" : "var(--text)",
          boxShadow: temFiltro ? "0 2px 8px rgba(99,102,241,0.3)" : "none",
        }}
      >
        {temFiltro ? `Categorias (${categoriaSel.length})` : "Todos"}
        <FaChevronDown style={{ fontSize: 10, transition: "transform 0.2s", transform: aberto ? "rotate(180deg)" : "none" }} />
      </button>

      {aberto && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 100,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          minWidth: 200,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Filtrar por categoria
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
            {categorias.map(cat => (
              <label key={cat} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 6px", borderRadius: 8, transition: "background 0.15s", fontSize: 13 }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <input
                  type="checkbox"
                  checked={selecionadas.includes(cat)}
                  onChange={() => toggle(cat)}
                  style={{ accentColor: "var(--accent)", width: 15, height: 15 }}
                />
                <span>{ICONES[cat] || "📦"} {cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
              </label>
            ))}
          </div>
          <button
            onClick={aplicar}
            style={{
              width: "100%", padding: "8px 0", borderRadius: 8, border: "none",
              background: "#4ade80", color: "#14532d", fontWeight: 700, fontSize: 13,
              cursor: "pointer", transition: "background 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#86efac"}
            onMouseLeave={e => e.currentTarget.style.background = "#4ade80"}
          >
            ✓ OK
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Card Vendedor ─────────────────────────────────────────────
function VendedorBadge({ nome, foto }) {
  const initials = nome ? nome.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0, overflow: "hidden" }}>
        {foto ? <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} /> : initials}
      </div>
      <span style={{ fontSize: 11, color: "var(--muted)" }}>{nome || "Vendedor"}</span>
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
  // CORREÇÃO 3: estado para o modal de chat
  const [chatProduto, setChatProduto]   = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const toast    = useToast();

  const meus = new URLSearchParams(location.search).get("meus") === "1";

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
  }, [meus]);

  function fmtPreco(v) {
    return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function ehMeuProduto(p) {
    return usuarioId && p.usuario_id === usuarioId;
  }

  // Abre chat — se não estiver logado, redireciona para login
  function abrirChat(produto) {
    if (!usuarioId) {
      toast("Faça login para conversar com o vendedor.", "error");
      navigate("/login");
      return;
    }
    setChatProduto(produto);
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

      {/* CORREÇÃO 2: botão "Todos" com dropdown de categorias */}
      {categorias.length > 0 && (
        <div className="filter-bar">
          <FiltroCategoria
            categorias={categorias}
            categoriaSel={categoriaSel}
            onAplicar={setCategoriaSel}
          />
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
            const meu     = ehMeuProduto(p);
            const imagens = parsearImagens(p.imagem_url);
            return (
              <div key={p.id} className="prod-card" style={meu ? { outline: "2px solid var(--accent)", outlineOffset: 2 } : {}}>
                {meu && (
                  <div style={{ position: "absolute", top: 8, right: 8, background: "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "2px 6px", zIndex: 3 }}>
                    SEU
                  </div>
                )}
                <div className="prod-thumb" style={{ padding: 0, overflow: "hidden" }}>
                  <Carrossel imagens={imagens} fallback={ICONES[p.categoria] || "📦"} altura="100%" />
                </div>
                <div className="prod-body">
                  <div className="prod-cat">{ICONES[p.categoria] || "📦"} {p.categoria}</div>
                  <div className="prod-name">{p.nome}</div>
                  <div className="prod-desc">{p.descricao || "Sem descrição."}</div>
                  {!meus && <VendedorBadge nome={p.vendedor_nome} foto={p.vendedor_foto} />}
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
                  // CORREÇÃO 3: botão "Tenho Interesse" no lugar de "Comprar"
                  <div className="prod-card-actions">
                    <button
                      className="btn btn-sm"
                      style={{ flex: 1, background: "#4ade80", color: "#14532d", border: "none", fontWeight: 700 }}
                      onClick={() => abrirChat(p)}
                    >
                      <FaCommentDots /> Tenho Interesse
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
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
                const meu     = ehMeuProduto(p);
                const imagens = parsearImagens(p.imagem_url);
                return (
                  <tr key={p.id} style={meu ? { background: "rgba(99,102,241,0.04)" } : {}}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 8, flexShrink: 0, overflow: "hidden", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                          <Carrossel imagens={imagens} fallback={ICONES[p.categoria] || "📦"} altura="42px" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {p.nome}
                            {meu && <span style={{ marginLeft: 6, fontSize: 10, background: "var(--accent)", color: "#fff", borderRadius: 3, padding: "1px 5px" }}>SEU</span>}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.descricao}</div>
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
                    {!meus && <td><VendedorBadge nome={p.vendedor_nome} foto={p.vendedor_foto} /></td>}
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
                        // CORREÇÃO 3: botão "Tenho Interesse" na lista também
                        <button
                          className="btn btn-sm"
                          style={{ width: "auto", background: "#4ade80", color: "#14532d", border: "none", fontWeight: 700 }}
                          onClick={() => abrirChat(p)}
                        >
                          <FaCommentDots /> Tenho Interesse
                        </button>
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
      {modalNovo && (
        <ModalProduto produto={null} onClose={() => setModalNovo(false)} onSalvo={buscarProdutos} toast={toast} />
      )}
      {editando && (
        <ModalProduto produto={editando} onClose={() => setEditando(null)} onSalvo={buscarProdutos} toast={toast} />
      )}
      {deletando && (
        <ModalDeletar produto={deletando} onClose={() => setDeletando(null)} onDeletado={buscarProdutos} toast={toast} />
      )}
      {/* CORREÇÃO 3: modal de chat */}
      {chatProduto && (
        <ModalChat produto={chatProduto} usuarioId={usuarioId} onClose={() => setChatProduto(null)} toast={toast} />
      )}
    </AppLayout>
  );
}

export default Produtos;