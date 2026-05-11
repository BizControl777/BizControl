import React, { createContext, useEffect, useMemo, useState } from "react";

export const AuthContext = createContext(null);
const AUTH_STORAGE_KEY = "bizcontrol.auth.session";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedSession) {
        setUser(JSON.parse(savedSession));
      }
    } catch (error) {
      console.error("Erro ao carregar sessão:", error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async ({ email, password, remember }) => {
    if (!window.api?.authLogin) {
      throw new Error("Serviço de autenticação não está disponível.");
    }

    const authUser = await window.api.authLogin({ email, password });
    setUser(authUser);

    if (remember) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }

    return authUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      login,
      logout,
      hasPermission: (permissionName) => {
        if (!user) return false;
        if (user.perfil === "admin") return true;
        return Array.isArray(user.permissoes) && user.permissoes.includes(permissionName);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
