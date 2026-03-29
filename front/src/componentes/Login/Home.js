import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./style.css";

function Home() {
  const navigate = useNavigate();

  const [mensagem, setMensagem] = useState("Você está logado no sistema");

  // 🚪 logout
  async function sair() {
    await fetch("http://localhost:3001/logout", {
      method: "POST",
      credentials: "include",
    });

    navigate("/");
  }

  // 🔒 verifica autenticação
  useEffect(() => {
    fetch("http://localhost:3001/home", {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          navigate("/");
        }
      })
      .catch(() => {
        navigate("/");
      });
  }, [navigate]);

  // ✅ botão permanecer logado
  function permanecerLogado() {
    setMensagem("Bem-vindo ao sistema 🎉");
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Bem-vindo 👋</h1>

        <p>{mensagem}</p>

        <button onClick={permanecerLogado}>
          Permanecer logado
        </button>

        <button onClick={sair}>
          Sair
        </button>
      </div>
    </div>
  );
}

export default Home;