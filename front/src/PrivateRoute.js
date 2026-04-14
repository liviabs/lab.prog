import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "./api";

function PrivateRoute({ children }) {
  const [autorizado, setAutorizado] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/verificar`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.logado) {
          setAutorizado(true);
        } else {
          navigate("/", { replace: true });
        }
      })
      .catch(() => navigate("/", { replace: true }));
  }, [navigate]);

  if (autorizado === null) {
    return <div className="container"><p>Carregando...</p></div>;
  }

  return autorizado ? children : null;
}

export default PrivateRoute;