import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/useAuth";

function initialsFromUser(user) {
  if (!user) return "?";
  const s = (user.nome || user.email || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return s.slice(0, 2).toUpperCase();
}

const navCls = ({ isActive }) => `nav-item${isActive ? " active" : ""}`;

const Layout = ({ children }) => {
  const { user, logout, hasPermission } = useAuth();

  const getMenuItems = () => {
    if (!user) return [];
    const role = user.perfil || user.role;
    if (role === 'admin' || role === 'super') {
      return [
        { to: "/", icon: "fa-house", label: "Dashboard" },
        { to: "/produtos", icon: "fa-box", label: "Produtos" },
        { to: "/inventario", icon: "fa-warehouse", label: "Inventário" },
        { to: "/vendas", icon: "fa-cash-register", label: "Vendas" },
        { to: "/clientes", icon: "fa-users", label: "Clientes" },
        { to: "/fornecedores", icon: "fa-truck-field", label: "Fornecedores" },
        { to: "/dividas", icon: "fa-file-invoice-dollar", label: "Dívidas" },
        { to: "/relatorio", icon: "fa-chart-line", label: "Relatórios" },
        { to: "/utilizadores", icon: "fa-user-group", label: "Utilizadores" },
        { to: "/admin", icon: "fa-shield-halved", label: "Admin" },
      ];
    } else {
      return [
        { to: "/", icon: "fa-house", label: "Dashboard" },
        { to: "/produtos", icon: "fa-box", label: "Produtos" },
        { to: "/inventario", icon: "fa-warehouse", label: "Inventário" },
        { to: "/vendas", icon: "fa-cash-register", label: "Vendas" },
        { to: "/clientes", icon: "fa-users", label: "Clientes" },
        { to: "/fornecedores", icon: "fa-truck-field", label: "Fornecedores" },
        { to: "/dividas", icon: "fa-file-invoice-dollar", label: "Dívidas" },
        { to: "/relatorio", icon: "fa-chart-line", label: "Relatórios" },
      ];
    }
  };

  return (
    <div id="app-shell">
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-logo">
            <i className="fa-solid fa-chart-simple" style={{ marginRight: 8 }}></i>
            BizController 360
          </span>
          <span className="topbar-company" id="topbar-company">
            {user?.empresa || "ELVATECH"}
          </span>
        </div>
        <div className="topbar-user">
          <div style={{ textAlign: "right" }}>
            <div className="user-name" id="topbar-username">
              {user?.nome || user?.email || "—"}
            </div>
            <div className="user-role" id="topbar-userrole">
              {user?.perfil || "Utilizador"}
            </div>
          </div>
          <div className="user-avatar" id="topbar-avatar">
            {initialsFromUser(user)}
          </div>
          <button className="btn-logout" onClick={logout}>
            Sair
          </button>
        </div>
      </div>
      <div className="main-layout">
        <div className="sidebar">
          <div className="nav-section">Menu</div>
          {getMenuItems().map((item) => (
            <NavLink key={item.to} to={item.to} end className={navCls}>
              <span className="nav-icon" aria-hidden="true">
                <i className={`fa-solid ${item.icon}`} />
              </span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
        <div className="content">{children}</div>
      </div>
      <footer className="app-footer" style={{ padding: 16, textAlign: "center", fontSize: 12, color: "var(--text2)", borderTop: "1px solid var(--border)", marginTop: 20 }}>
        <div>Desenvolvido por ELVATECH — Todos os direitos reservados © ELVATECH</div>
      </footer>
    </div>
  );
};

export default Layout;
