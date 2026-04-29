import { useEffect, useState, useRef } from "react";
import {
  FaUser, FaEnvelope, FaPhone, FaLock, FaEdit, FaTrash,
  FaCheckCircle, FaSave, FaTimes, FaCamera, FaKey, FaShieldAlt,
  FaCloudUploadAlt
} from "react-icons/fa";
import AppLayout from "../../AppLayout";
import { useToast } from "../../ToastContext";
import { apiFetch } from "../../api";

// ─── Helper: redimensiona imagem via canvas → base64 ─────────
const RESIZE_MAX_PX = 400; // foto de perfil não precisa ser grande

function redimensionarImagem(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > RESIZE_MAX_PX || height > RESIZE_MAX_PX) {
          if (width > height) {
            height = Math.round((height * RESIZE_MAX_PX) / width);
            width = RESIZE_MAX_PX;
          } else {
            width = Math.round((width * RESIZE_MAX_PX) / height);
            height = RESIZE_MAX_PX;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── Upload de Foto de Perfil ─────────────────────────────────
function UploadFotoPerfil({ fotoAtual, onChange }) {
  const inputRef    = useRef(null);
  const [preview, setPreview]       = useState(fotoAtual || "");
  const [processando, setProcessando] = useState(false);
  const [erro, setErro]             = useState("");

  // Sincronizar preview quando o perfil carregar
  useEffect(() => { setPreview(fotoAtual || ""); }, [fotoAtual]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErro("Arquivo muito grande. Máximo: 5MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErro("Selecione um arquivo de imagem.");
      return;
    }

    setErro("");
    setProcessando(true);
    try {
      const base64 = await redimensionarImagem(file);
      setPreview(base64);
      onChange(base64);
    } catch {
      setErro("Erro ao processar imagem. Tente outro arquivo.");
    } finally {
      setProcessando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remover() {
    setPreview("");
    onChange("");
  }

  const initials = "?"; // o componente pai passa a foto, não as iniciais

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      {/* Avatar grande clicável */}
      <div
        style={{ position: "relative", cursor: "pointer" }}
        onClick={() => !processando && inputRef.current?.click()}
        title="Clique para trocar a foto"
      >
        <div style={{
          width: 96, height: 96, borderRadius: "50%", overflow: "hidden",
          border: "3px solid var(--accent)",
          background: "linear-gradient(135deg, var(--accent), #a855f7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, fontWeight: 700, color: "#fff",
        }}>
          {preview
            ? <img src={preview} alt="Foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <FaUser style={{ fontSize: 36, opacity: 0.8 }} />
          }
        </div>

        {/* Overlay da câmera */}
        <div style={{
          position: "absolute", bottom: 0, right: 0,
          width: 28, height: 28, borderRadius: "50%",
          background: "var(--accent)", border: "2px solid var(--surface)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 12,
        }}>
          {processando ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <FaCamera />}
        </div>
      </div>

      {/* Botões de ação */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => inputRef.current?.click()}
          disabled={processando}
          style={{ width: "auto", fontSize: 12 }}
        >
          <FaCloudUploadAlt />
          {preview ? "Trocar foto" : "Adicionar foto"}
        </button>
        {preview && (
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={remover}
            disabled={processando}
            style={{ width: "auto", fontSize: 12 }}
          >
            <FaTrash /> Remover
          </button>
        )}
      </div>

      {erro && <div style={{ color: "var(--error)", fontSize: 12 }}>{erro}</div>}
      <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
        JPG, PNG ou WEBP · máx. 5MB
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFile}
      />
    </div>
  );
}

// ─── Seção: Info Básica ───────────────────────────────────────
function SecaoInfo({ perfil, onAtualizado, toast }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm]         = useState({ nome: "", bio: "", foto_url: "" });
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (perfil) setForm({ nome: perfil.nome, bio: perfil.bio || "", foto_url: perfil.foto_url || "" });
  }, [perfil]);

  async function salvar() {
    if (!form.nome.trim()) { toast("Nome é obrigatório.", "error"); return; }
    setLoading(true);
    try {
      const r = await apiFetch("/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (r.ok) { toast("Perfil atualizado!", "success"); setEditando(false); onAtualizado(); }
      else toast(d.mensagem || "Erro ao salvar.", "error");
    } catch { toast("Erro de conexão.", "error"); }
    finally { setLoading(false); }
  }

  if (!perfil) return null;

  const initials = perfil.nome.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const membro   = new Date(perfil.criado_em).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="perfil-card">
      <div className="perfil-card-header">
        <span><FaUser style={{ marginRight: 8 }} />Informações Pessoais</span>
        {!editando && (
          <button className="btn btn-ghost btn-sm" onClick={() => setEditando(true)}>
            <FaEdit /> Editar
          </button>
        )}
      </div>

      {editando ? (
        /* ── Modo edição ───────────────────────────────────── */
        <div className="perfil-form">
          {/* Upload de foto */}
          <div className="field" style={{ alignItems: "center" }}>
            <label style={{ textAlign: "center", width: "100%" }}>Foto de Perfil</label>
            <UploadFotoPerfil
              fotoAtual={form.foto_url}
              onChange={(base64) => setForm(f => ({ ...f, foto_url: base64 }))}
            />
          </div>

          <div className="field">
            <label>Nome completo *</label>
            <input
              type="text"
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Seu nome"
            />
          </div>
          <div className="field">
            <label>Bio</label>
            <textarea
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Conte um pouco sobre você..."
              rows={3}
            />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button className="btn btn-primary" style={{ width: "auto" }} onClick={salvar} disabled={loading}>
              {loading ? <><span className="spinner" /> Salvando...</> : <><FaSave /> Salvar</>}
            </button>
            <button className="btn btn-ghost" style={{ width: "auto" }} onClick={() => {
              setEditando(false);
              setForm({ nome: perfil.nome, bio: perfil.bio || "", foto_url: perfil.foto_url || "" });
            }}>
              <FaTimes /> Cancelar
            </button>
          </div>
        </div>
      ) : (
        /* ── Modo visualização ────────────────────────────── */
        <>
          <div className="perfil-avatar-row">
            <div className="perfil-avatar-wrap">
              {perfil.foto_url ? (
                <img src={perfil.foto_url} alt="Foto" className="perfil-avatar-img" />
              ) : (
                <div className="perfil-avatar-initials">{initials}</div>
              )}
            </div>
            <div>
              <div className="perfil-name">{perfil.nome}</div>
              <div className="perfil-since">Membro desde {membro}</div>
            </div>
          </div>

          <div className="perfil-info-list">
            <div className="perfil-info-item">
              <FaEnvelope className="perfil-info-icon" />
              <div>
                <div className="perfil-info-label">E-mail</div>
                <div className="perfil-info-value">{perfil.email}</div>
              </div>
            </div>
            {perfil.bio && (
              <div className="perfil-info-item">
                <FaUser className="perfil-info-icon" />
                <div>
                  <div className="perfil-info-label">Bio</div>
                  <div className="perfil-info-value">{perfil.bio}</div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Seção: Telefone ──────────────────────────────────────────
function SecaoTelefone({ perfil, onAtualizado, toast }) {
  const [tel, setTel]         = useState("");
  const [codigo, setCodigo]   = useState("");
  const [fase, setFase]       = useState("inicial");
  const [loading, setLoading] = useState(false);
  const [codigoSimulado, setCodigoSimulado] = useState("");

  useEffect(() => {
    if (perfil) {
      setTel(perfil.telefone || "");
      if (perfil.telefone_verificado) setFase("verificado");
      else if (perfil.telefone) setFase("aguardando");
      else setFase("inicial");
    }
  }, [perfil]);

  async function enviarCodigo() {
    if (!tel.trim()) { toast("Informe o número.", "error"); return; }
    setLoading(true);
    try {
      const r = await apiFetch("/perfil/telefone/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: tel }),
      });
      const d = await r.json();
      if (r.ok) {
        toast("Código enviado! Verifique o simulado abaixo.", "success");
        setFase("aguardando");
        setCodigoSimulado(d.codigo_simulado || "");
      } else toast(d.mensagem || "Erro.", "error");
    } catch { toast("Erro de conexão.", "error"); }
    finally { setLoading(false); }
  }

  async function confirmarCodigo() {
    if (!codigo.trim()) { toast("Informe o código.", "error"); return; }
    setLoading(true);
    try {
      const r = await apiFetch("/perfil/telefone/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const d = await r.json();
      if (r.ok) { toast(d.mensagem, "success"); setFase("verificado"); onAtualizado(); }
      else toast(d.mensagem || "Código inválido.", "error");
    } catch { toast("Erro de conexão.", "error"); }
    finally { setLoading(false); }
  }

  if (!perfil) return null;

  return (
    <div className="perfil-card">
      <div className="perfil-card-header">
        <span><FaPhone style={{ marginRight: 8 }} />Telefone</span>
        {fase === "verificado" && (
          <span className="badge badge-green" style={{ fontSize: 12 }}>
            <FaCheckCircle style={{ marginRight: 4 }} /> Verificado
          </span>
        )}
      </div>

      {fase === "verificado" ? (
        <div className="perfil-info-list">
          <div className="perfil-info-item">
            <FaPhone className="perfil-info-icon" />
            <div>
              <div className="perfil-info-label">Número verificado</div>
              <div className="perfil-info-value">{perfil.telefone}</div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 12, width: "auto" }}
            onClick={() => { setFase("inicial"); setTel(""); setCodigo(""); setCodigoSimulado(""); }}
          >
            Alterar número
          </button>
        </div>
      ) : (
        <div className="perfil-form">
          <div className="field">
            <label>Número de Telefone / WhatsApp</label>
            <input
              type="tel"
              placeholder="(31) 99999-9999"
              value={tel}
              onChange={e => setTel(e.target.value.replace(/\D/g, ""))}
              disabled={fase === "aguardando"}
            />
          </div>

          {fase === "inicial" && (
            <button className="btn btn-primary" style={{ width: "auto" }} onClick={enviarCodigo} disabled={loading}>
              {loading ? <><span className="spinner" /> Enviando...</> : "Enviar código de verificação"}
            </button>
          )}

          {fase === "aguardando" && (
            <>
              {codigoSimulado && (
                <div className="alert alert-success" style={{ marginBottom: 12 }}>
                  📱 <strong>Simulação:</strong> Código SMS = <strong style={{ letterSpacing: 3 }}>{codigoSimulado}</strong>
                  <div style={{ fontSize: 11, marginTop: 4, color: "var(--muted)" }}>Em produção, este código seria enviado via SMS.</div>
                </div>
              )}
              <div className="field">
                <label>Código recebido (6 dígitos)</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.replace(/\D/g, ""))}
                  style={{ letterSpacing: 6, fontSize: 20, textAlign: "center" }}
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-primary" style={{ width: "auto" }} onClick={confirmarCodigo} disabled={loading}>
                  {loading ? <><span className="spinner" /> Verificando...</> : <><FaShieldAlt /> Verificar</>}
                </button>
                <button className="btn btn-ghost" style={{ width: "auto" }} onClick={enviarCodigo} disabled={loading}>
                  Reenviar código
                </button>
                <button className="btn btn-ghost" style={{ width: "auto" }} onClick={() => { setFase("inicial"); setCodigoSimulado(""); setCodigo(""); }}>
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Seção: Alterar Senha ─────────────────────────────────────
function SecaoSenha({ toast }) {
  const [form, setForm]         = useState({ atual: "", nova: "", confirmar: "" });
  const [loading, setLoading]   = useState(false);
  const [showAtual, setShowAtual]           = useState(false);
  const [showNova, setShowNova]             = useState(false);
  const [showConfirmar, setShowConfirmar]   = useState(false);

  function set(campo, valor) { setForm(f => ({ ...f, [campo]: valor })); }

  async function alterar() {
    if (!form.atual || !form.nova || !form.confirmar) { toast("Preencha todos os campos.", "error"); return; }
    if (form.nova !== form.confirmar)  { toast("As novas senhas não coincidem.", "error"); return; }
    if (form.nova.length < 8)          { toast("A nova senha deve ter ao menos 8 caracteres.", "error"); return; }
    setLoading(true);
    try {
      const r = await apiFetch("/perfil/senha", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha_atual: form.atual, nova_senha: form.nova }),
      });
      const d = await r.json();
      if (r.ok) { toast("Senha alterada com sucesso!", "success"); setForm({ atual: "", nova: "", confirmar: "" }); }
      else toast(d.mensagem || "Erro ao alterar senha.", "error");
    } catch { toast("Erro de conexão.", "error"); }
    finally { setLoading(false); }
  }

  function CampoSenha({ label, campo, show, setShow }) {
    return (
      <div className="field">
        <label>{label}</label>
        <div style={{ position: "relative" }}>
          <input
            type={show ? "text" : "password"}
            placeholder="••••••••"
            value={form[campo]}
            onChange={e => set(campo, e.target.value)}
            style={{ paddingRight: 42 }}
          />
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0 }}
          >
            {show ? "🙈" : "👁️"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="perfil-card">
      <div className="perfil-card-header">
        <span><FaKey style={{ marginRight: 8 }} />Alterar Senha</span>
      </div>
      <div className="perfil-form">
        <CampoSenha label="Senha atual"           campo="atual"     show={showAtual}     setShow={setShowAtual} />
        <CampoSenha label="Nova senha"            campo="nova"      show={showNova}      setShow={setShowNova} />
        <CampoSenha label="Confirmar nova senha"  campo="confirmar" show={showConfirmar} setShow={setShowConfirmar} />
        <div style={{ background: "var(--surface2)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
          🔒 A nova senha deve ter ao menos 8 caracteres, incluindo letras e números.
        </div>
        <button className="btn btn-primary" style={{ width: "auto" }} onClick={alterar} disabled={loading}>
          {loading ? <><span className="spinner" /> Alterando...</> : <><FaLock /> Alterar senha</>}
        </button>
      </div>
    </div>
  );
}

// ─── Página Perfil ────────────────────────────────────────────
function Perfil() {
  const [perfil, setPerfil]   = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  async function carregar() {
    setLoading(true);
    try {
      const r = await apiFetch("/perfil");
      const d = await r.json();
      if (r.ok) setPerfil(d.perfil);
    } catch { toast("Erro ao carregar perfil.", "error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, []);

  return (
    <AppLayout title="Meu Perfil">
      {loading ? (
        <div className="empty-state">
          <div className="big-spinner" style={{ width: 36, height: 36, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
          <span style={{ color: "var(--muted)", fontSize: 14 }}>Carregando...</span>
        </div>
      ) : (
        <div className="perfil-grid">
          <SecaoInfo     perfil={perfil} onAtualizado={carregar} toast={toast} />
          <SecaoTelefone perfil={perfil} onAtualizado={carregar} toast={toast} />
          <SecaoSenha    toast={toast} />
        </div>
      )}
    </AppLayout>
  );
}

export default Perfil;