import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Layout = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo-container">
          <img src="/bizcontrol.png" alt="BizControl" className="logo" />
          <h2>BIZCONTROL</h2>
        </div>

        <nav className="menu">
          <Link to="/">Dashboard</Link>
          <Link to="/inventario" title="Gerenciar inventário">Inventário</Link>
          <Link to="/produtos">Produtos</Link>
          <Link to="/movimentos" title="Histórico de movimentos">Movimentos</Link>
          <Link to="/relatorio" title="Relatórios e análises">Relatórios</Link>
          <Link to="/utilizadores" title="Gerenciar utilizadores">Utilizadores</Link>
        </nav>

        <div className="session-box">
          <p className="session-user">{user?.nome || user?.email}</p>
          <button type="button" className="session-logout" onClick={logout}>
            Terminar sessão
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        {children}
      </main>
    </div>
  );
};

export default Layout;
