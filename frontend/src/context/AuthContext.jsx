import { createContext, useContext, useEffect, useState } from "react";
import { API } from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const jwt = localStorage.getItem("jwt");
    if (!jwt) { setAuthLoading(false); return; }

    fetch(`${API}/api/me`, { headers: { Authorization: `Bearer ${jwt}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setUser(data);
        else localStorage.removeItem("jwt");
      })
      .catch(() => localStorage.removeItem("jwt"))
      .finally(() => setAuthLoading(false));
  }, []);

  async function login(jwt) {
    localStorage.setItem("jwt", jwt);
    const data = await fetch(`${API}/api/me`, {
      headers: { Authorization: `Bearer ${jwt}` },
    }).then((r) => r.json());
    setUser(data);
  }

  function logout() {
    localStorage.removeItem("jwt");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, authLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
