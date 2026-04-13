import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function PrivateRoute({ children }) {
  const [autorizado, setAutorizado] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:3001/verificar", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.logado) {
          setAutorizado(true);
        } else {
          setAutorizado(false);
          navigate("/");
        }
      })
      .catch(() => {
        setAutorizado(false);
        navigate("/");
      });
}, [navigate]);

  if (autorizado === null) return <p>Carregando...</p>;

  return autorizado ? children : null;
}

export default PrivateRoute;