import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "./api";

function PrivateRoute({ children }) {
  const [autorizado, setAutorizado] = useState(null);
  const navigate = useNavigate();

  // Verificação inicial ao entrar na página
  useEffect(() => {
    apiFetch("/verificar")
      .then(r => r.json())
      .then(d => {
        if (d.logado) setAutorizado(true);
        else { setAutorizado(false); navigate("/", { replace: true }); }
      })
      .catch(() => { setAutorizado(false); navigate("/", { replace: true }); });
  }, [navigate]);

  useEffect(() => {
    const id = setInterval(() => {
      apiFetch("/verificar")
        .then(r => r.json())
        .then(d => { if (!d.logado) navigate("/", { replace: true }); })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, [navigate]);

  if (autorizado === null) return (
    <div className="page-loading">
      <div className="big-spinner" />
      <span>Verificando sessão...</span>
    </div>
  );

  return autorizado ? children : null;
}

export default PrivateRoute;
