import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./componentes/Login/Login";
import Register from "./componentes/Login/Register";
import Home from "./componentes/Login/Home";
import BemVindo from "./componentes/Login/BemVindo"; 

import PrivateRoute from "./PrivateRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* 🔓 rotas públicas */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 🔒 rota protegida HOME */}
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />

        {/* 🔒 nova rota protegida */}
        <Route
          path="/bemvindo"
          element={
            <PrivateRoute>
              <BemVindo />
            </PrivateRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;