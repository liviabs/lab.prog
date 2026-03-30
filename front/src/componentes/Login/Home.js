import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./style.css";

function Home() {
  const navigate = useNavigate();

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

  function permanecerLogado() {
    navigate("/bemvindo");
  }

  async function sair() {
    await fetch("http://localhost:3001/logout", {
      method: "POST",
      credentials: "include",
    });

    navigate("/");
  }

  return (
    <div className="container">
      <div className="card animar">
        <p className="mensagem">Você está logado no sistema!</p>

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