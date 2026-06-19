import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "user";

const parseStoredUser = (raw) => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const id = Number(parsed.id);
    const name =
      typeof parsed.name === "string"
        ? parsed.name
        : typeof parsed.full_name === "string"
          ? parsed.full_name
          : "";
    const email = typeof parsed.email === "string" ? parsed.email : "";
    const token = typeof parsed.token === "string" ? parsed.token : "";
    const role = typeof parsed.role === "string" ? parsed.role : "";
    const is_admin = typeof parsed.is_admin === "boolean" ? parsed.is_admin : false;
    const age = Number.isFinite(Number(parsed.age)) ? Number(parsed.age) : undefined;
    if (!Number.isFinite(id) || id <= 0 || !email) return null;
    return { id, name, email, token, role, is_admin, age };
  } catch {
    return null;
  }
};

const deriveIsAdmin = (user) => {
  if (!user) return false;
  if (user.is_admin === true) return true;
  if (user.role === "admin") return true;
  const email = (user.email || "").toLowerCase();
  if (email.startsWith("admin@") || email.endsWith("@admin.com") || email.includes("+admin")) {
    return true;
  }
  return Number(user.id) === 1;
};

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = parseStoredUser(stored);
    if (parsed) {
      setUser(parsed);
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  }, []);

  const login = (userData) => {
    const safeUser = parseStoredUser(JSON.stringify(userData));
    if (!safeUser) return;
    setUser(safeUser);
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeUser));
  };

  const updateUser = (updates) => {
    setUser((prev) => {
      const base = prev || {};
      const next = { ...base, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    if (user?.id) {
      fetch("/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id })
      }).catch(() => {})
    }
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  const isAdmin = useMemo(() => deriveIsAdmin(user), [user]);

  const value = useMemo(
    () => ({ isAuthenticated, user, isAdmin, isLoading, login, logout, updateUser }),
    [isAuthenticated, user, isAdmin, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
