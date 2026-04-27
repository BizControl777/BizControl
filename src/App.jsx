import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Produtos from "./pages/produtos";
import Inventario from "./pages/Inventario";
import Movimentos from "./pages/Movimentos";
import Relatorio from "./pages/Relatorio";
import Utilizadores from "./pages/Utilizadores";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/produtos"
            element={
              <ProtectedRoute>
                <Produtos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventario"
            element={
              <ProtectedRoute>
                <Inventario />
              </ProtectedRoute>
            }
          />
          <Route
            path="/movimentos"
            element={
              <ProtectedRoute>
                <Movimentos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/relatorio"
            element={
              <ProtectedRoute>
                <Relatorio />
              </ProtectedRoute>
            }
          />
          <Route
            path="/utilizadores"
            element={
              <ProtectedRoute>
                <Utilizadores />
              </ProtectedRoute>
            }
          />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;