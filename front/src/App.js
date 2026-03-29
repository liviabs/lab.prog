import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./componentes/Login/Login";
import Register from "./componentes/Login/Register";
import Home from "./componentes/Login/Home";
import PrivateRoute from "./PrivateRoute"; // 👈 importar

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 🔒 rota protegida */}
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;