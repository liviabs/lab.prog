import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login    from "./componentes/Login/Login";
import Register from "./componentes/Login/Register";
import Home     from "./componentes/Login/Home";
import BemVindo from "./componentes/Login/BemVindo";
import PrivateRoute from "./PrivateRoute";

import "./componentes/Login/globals.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<Login />} />
        <Route path="/login"   element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/home" element={
          <PrivateRoute><Home /></PrivateRoute>
        } />
        <Route path="/bemvindo" element={
          <PrivateRoute><BemVindo /></PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;