import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("chatapp_user");
    const storedToken = localStorage.getItem("chatapp_token");
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  const loginWithGoogle = async (credential) => {
    const { data } = await api.post("/auth/google", { credential });
    localStorage.setItem("chatapp_token", data.token);
    localStorage.setItem("chatapp_user", JSON.stringify(data));
    setToken(data.token);
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("chatapp_token");
    localStorage.removeItem("chatapp_user");
    setUser(null);
    setToken(null);
  };

  const updateUser = (updatedData) => {
    const updated = { ...user, ...updatedData };
    localStorage.setItem("chatapp_user", JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginWithGoogle, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
