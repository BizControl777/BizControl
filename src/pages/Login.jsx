import React, { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const Login = () => {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [canRegister, setCanRegister] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    nome: "",
    email: "",
    password: "",
    confirmPassword: "",
    masterPassword: "",
  });

  const destination = location.state?.from?.pathname || "/";

  if (isAuthenticated) {
    return <Navigate to={destination} replace />;
  }

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  useEffect(() => {
    const checkAvailability = async () => {
      if (!window.api?.authCanRegister) return;
      try {
        const available = await window.api.authCanRegister();
        setCanRegister(available);
      } catch (availabilityError) {
        console.error("Falha ao validar disponibilidade de registo:", availabilityError);
      }
    };
    checkAvailability();
  }, []);

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

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    if (registerForm.password !== registerForm.confirmPassword) {
      setSubmitting(false);
      setError("A confirmação de senha não corresponde.");
      return;
    }

    try {
      await window.api.authRegister({
        nome: registerForm.nome,
        email: registerForm.email,
        password: registerForm.password,
        masterPassword: registerForm.masterPassword,
      });

      setShowRegister(false);
      setCanRegister(false);
      setForm((prev) => ({
        ...prev,
        email: registerForm.email,
        password: registerForm.password,
      }));
      setError("Conta criada com sucesso. Faça login para continuar.");
    } catch (registerError) {
      console.error("Falha ao criar conta:", registerError);
      setError(registerError?.message || "Não foi possível criar a conta.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img src="/bizcontrol.png" alt="BizControl" />
          <h1>BizControl</h1>
          <p>Inicie sessão para gerir o seu negócio.</p>
        </div>

        {!showRegister ? (
          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="username"
              placeholder="Digite o seu email"
              value={form.email}
              onChange={handleChange}
              required
            />

            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              value={form.password}
              onChange={handleChange}
              required
            />

            <label className="remember-checkbox">
              <input
                type="checkbox"
                name="remember"
                checked={form.remember}
                onChange={handleChange}
              />
              Manter sessão iniciada neste dispositivo
            </label>

            {error ? <p className="login-error">{error}</p> : null}

            <button type="submit" disabled={submitting}>
              {submitting ? "A autenticar..." : "Entrar"}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleRegisterSubmit}>
            <label htmlFor="nome">Nome</label>
            <input
              id="nome"
              type="text"
              name="nome"
              placeholder="Nome do proprietário"
              value={registerForm.nome}
              onChange={handleRegisterChange}
              required
            />

            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              name="email"
              placeholder="Email de acesso"
              value={registerForm.email}
              onChange={handleRegisterChange}
              required
            />

            <label htmlFor="register-password">Senha</label>
            <input
              id="register-password"
              type="password"
              name="password"
              placeholder="Senha da nova conta"
              value={registerForm.password}
              onChange={handleRegisterChange}
              required
            />

            <label htmlFor="confirm-password">Confirmar senha</label>
            <input
              id="confirm-password"
              type="password"
              name="confirmPassword"
              placeholder="Repita a senha"
              value={registerForm.confirmPassword}
              onChange={handleRegisterChange}
              required
            />

            <label htmlFor="master-password">Senha mestre</label>
            <input
              id="master-password"
              type="password"
              name="masterPassword"
              placeholder="Senha de autorização"
              value={registerForm.masterPassword}
              onChange={handleRegisterChange}
              required
            />

            {error ? <p className="login-error">{error}</p> : null}

            <button type="submit" disabled={submitting}>
              {submitting ? "A criar conta..." : "Criar conta"}
            </button>
          </form>
        )}

        <div className="login-actions">
          {canRegister ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setError("");
                setShowRegister((prev) => !prev);
              }}
            >
              {showRegister ? "Voltar ao login" : "Criar conta"}
            </button>
          ) : (
            <p className="login-help-text">Registo bloqueado: já existe uma conta ativa.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
