import { createContext, useContext, useState, useCallback } from "react";
import { login as loginApi, signup as signupApi } from "../services/authService";

const AuthContext = createContext(null);

function loadPersistedUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadPersistedUser);
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);

  const persist = (userData, jwt) => {
    localStorage.setItem("token", jwt);
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(jwt);
    setUser(userData);
  };

  const login = useCallback(async (credentials) => {
    const { data } = await loginApi(credentials);
    persist(data.user, data.token);
    return data;
  }, []);

  const signup = useCallback(async (formData) => {
    const { data } = await signupApi(formData);
    persist(data.user, data.token);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
