import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./style.css";

function BemVindo() {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  // Verificação inicial
  useEffect(() => {
    async function verificar() {
      try {
        const res = await fetch("http://localhost:3001/verificar", {
          credentials: "include",
        });

        const data = await res.json();

        if (!data.logado) {
          navigate("/login");
          return;
        }

        setUsuario(data.usuario);

      } catch (erro) {
        navigate("/login");
      } finally {
        setCarregando(false);
      }
    }

    verificar();
  }, [navigate]);

  // Verificação periódica (a cada 30 segundos)
  useEffect(() => {
    const intervalo = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:3001/verificar", {
          credentials: "include",
        });

        const data = await res.json();

        if (!data.logado) {
          navigate("/login");
        }
      } catch (erro) {
        navigate("/login");
      }
    }, 30000);

    return () => clearInterval(intervalo);
  }, [navigate]);

  if (carregando) {
    return <h1>Carregando...</h1>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      {usuario && <h2>Bem-vindo, {usuario.nome}</h2>}
    </div>
  );
}

export default BemVindo;