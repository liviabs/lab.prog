import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "./api";

function PrivateRoute({ children }) {
  const [autorizado, setAutorizado] = useState(null);
  const navigate = useNavigate();

  // Verificação inicial ao entrar na página
  useEffect(() => {
    fetch(`${API}/verificar`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.logado) {
          setAutorizado(true);
        } else {
          setAutorizado(false);
          navigate("/", { replace: true });
        }
      })
      .catch(() => {
        setAutorizado(false);
        navigate("/", { replace: true });
      });
  }, [navigate]);

  // Polling a cada 30s — detecta token expirado em qualquer página protegida
  useEffect(() => {
    const intervalo = setInterval(() => {
      fetch(`${API}/verificar`, { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (!data.logado) navigate("/", { replace: true });
        })
        .catch(() => navigate("/", { replace: true }));
    }, 30000);

    return () => clearInterval(intervalo);
  }, [navigate]);

  if (autorizado === null) {
    return <div className="container"><p>Carregando...</p></div>;
  }

  return autorizado ? children : null;
}

export default PrivateRoute;