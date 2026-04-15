import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import "./Produtos.css";

const ICONES = {
  roupas:           "👕",
  moveis:           "🛋️",
  automoveis:       "🚗",
  sapatos:          "👟",
  animais:          "🐾",
  eletronicos:      "💻",
  eletrodomesticos: "🏠",
  esportes:         "🚴",
};

function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSel, setCategoriaSel] = useState([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);

  const navigate = useNavigate();

  // Buscar categorias
  useEffect(() => {
    fetch(`${API}/categorias`, {
      credentials: "include"
    })
    .then((res) => res.json())
    .then((data) => {
        console.log("CATEGORIAS BACKEND:", data);
        setCategorias(data.categorias || []);
    })
    .catch(() => {});
  }, []);

  // Selecionar / deselecionar categoria
  function toggleCategoria(cat) {
    setCategoriaSel((prev) => {
      if (prev.includes(cat)) {
        return prev.filter((c) => c !== cat);
      } else {
        return [...prev, cat];
      }
    });
  }

  // Buscar produtos
  useEffect(() => {
    setCarregando(true);

    const params = new URLSearchParams();

    if (categoriaSel.length > 0) {
      params.append("categorias", categoriaSel.join(","));
    }

    if (busca) {
      params.append("busca", busca);
    }

    fetch(`${API}/produtos`, {
      credentials: "include"
    })
      .then((res) => res.json())
      .then((data) => setProdutos(data.produtos || []))
      .catch(() => setProdutos([]))
      .finally(() => setCarregando(false));
  }, [categoriaSel, busca]);

  function formatarPreco(preco) {
    return Number(preco).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <div className="produtos-pagina">

      {/* TOPO */}
      <div className="produtos-topo">
        <button className="btn-voltar" onClick={() => navigate("/bemvindo")}>
          ← Voltar
        </button>

        <h2>Produtos</h2>

        <input
          type="text"
          placeholder="Buscar produto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="produtos-busca"
        />
      </div>

      {/* CATEGORIAS (NOVO FORMATO) */}
      <div className="categorias-menu">
        {categorias.map((cat) => (
          <label key={cat} className="cat-checkbox">
            <input
              type="checkbox"
              checked={categoriaSel.includes(cat)}
              onChange={() => toggleCategoria(cat)}
            />

            <span className="checkmark">
              {categoriaSel.includes(cat) ? "☑" : "☐"}
            </span>

            {ICONES[cat] || "📦"}{" "}
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </label>
        ))}
      </div>

      {/* LISTA */}
      {carregando ? (
        <p className="produtos-status">Carregando...</p>
      ) : produtos.length === 0 ? (
        <p className="produtos-status">Nenhum produto encontrado.</p>
      ) : (
        <div className="produtos-grid">
          {produtos.map((p) => (
            <div key={p.id} className="produto-card">
              <div className="produto-imagem">
                {p.imagem_url ? (
                  <img src={p.imagem_url} alt={p.nome} />
                ) : (
                  <span className="produto-sem-imagem">
                    {ICONES[p.categoria] || "📦"}
                  </span>
                )}
              </div>

              <div className="produto-info">
                <span className="produto-categoria">{p.categoria}</span>
                <h3 className="produto-nome">{p.nome}</h3>
                <p className="produto-descricao">{p.descricao}</p>

                <div className="produto-rodape">
                  <span className="produto-preco">
                    {formatarPreco(p.preco)}
                  </span>

                  <span className="produto-estoque">
                    {p.estoque > 0
                      ? `${p.estoque} em estoque`
                      : "Indisponível"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Produtos;