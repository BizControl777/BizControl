import React, { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const Login = () => {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const destination = location.state?.from?.pathname || "/";

  if (isAuthenticated) {
    return <Navigate to={destination} replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(form);
      navigate(destination, { replace: true });
    } catch (loginError) {
      console.error("Falha no login:", loginError);
      setError(loginError?.message || "Não foi possível iniciar sessão.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="login-screen">
      <div className="login-box">
        <div className="logo-area">
          <div className="logo-icon">
            <i className="fa-solid fa-chart-simple"></i>
          </div>
          <div className="logo-title">BizControl</div>
          <div className="logo-sub">Desenvolvido pela ElvaTech</div>
          <div style={{ fontSize: "11px", color: "var(--text2)", marginTop: "8px" }}>
            Todos os direitos reservados © ElvaTech
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Utilizador</label>
            <input
              type="text"
              name="email"
              placeholder="ex: vendedor1"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input
              type="password"
              name="password"
              placeholder="••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          {error && <div style={{ color: "var(--red)", fontSize: "12px", marginBottom: "16px" }}>{error}</div>}
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Entrando..." : "Entrar no Sistema"}
          </button>
        </form>
        <div className="demo-hint">
          Demo: vendedor1 / 123456
        </div>
      </div>
    </div>
  );
};

export default Login;
