import { useNavigate } from "react-router-dom";
import API from "../../api";

function Home() {
  const navigate = useNavigate();

  async function sair() {
    await fetch(`${API}/logout`, {
      method: "POST",
      credentials: "include",
    });
    navigate("/", { replace: true });
  }

  return (
    <div className="container">
      <div className="card animar">
        <p className="mensagem">Você está logado no sistema!</p>
        <button onClick={() => navigate("/bemvindo")}>Continuar</button>
        <button onClick={sair}>Sair</button>
      </div>
    </div>
  );
}

export default Home;