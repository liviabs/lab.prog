import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login    from "./componentes/Login/Login";
import Register from "./componentes/Login/Register";
import Home     from "./componentes/Login/Home";
import BemVindo from "./componentes/Login/BemVindo";
import Produtos from "./componentes/Produtos/Produtos";
import Perfil   from "./componentes/Perfil/Perfil";
import PerfilVendedor from "./componentes/Perfil/PerfilVendedor";



import PrivateRoute      from "./PrivateRoute";
import { ToastProvider } from "./ToastContext";
import "./componentes/Login/globals.css";

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/"         element={<Login />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/home"     element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/bemvindo" element={<PrivateRoute><BemVindo /></PrivateRoute>} />
          <Route path="/produtos" element={<PrivateRoute><Produtos /></PrivateRoute>} />
          <Route path="/perfil"   element={<PrivateRoute><Perfil /></PrivateRoute>} />
          <Route path="/vendedor/:id"   element={<PrivateRoute><PerfilVendedor /></PrivateRoute>} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
