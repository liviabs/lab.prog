import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login    from "./componentes/Login/Login";
import Register from "./componentes/Login/Register";
import Home     from "./componentes/Login/Home";
import BemVindo from "./componentes/Login/BemVindo";
import Produtos from "./componentes/Produtos/Produtos";

import PrivateRoute from "./PrivateRoute";
import "./componentes/Login/globals.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Únicas páginas acessíveis sem login */}
        <Route path="/"         element={<Login />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Tudo abaixo exige token válido */}
        <Route path="/home" element={
          <PrivateRoute><Home /></PrivateRoute>
        } />
        <Route path="/bemvindo" element={
          <PrivateRoute><BemVindo /></PrivateRoute>
        } />
        <Route path="/produtos" element={
          <PrivateRoute><Produtos /></PrivateRoute>
        } />

      </Routes>
    </BrowserRouter>
  );
}

export default App;