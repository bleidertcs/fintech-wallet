import { createContext, useContext, useState, useEffect } from 'react';
import { authService, userService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingTotp, setPendingTotp] = useState(null); // email waiting for 2FA

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    const data = res.data;

    if (data.totpRequired) {
      setPendingTotp(email);
      return { totpRequired: true };
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const verifyTotp = async (email, code) => {
    const res = await authService.verifyTotp(email, code);
    const data = res.data;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    setPendingTotp(null);
    return data;
  };

  const register = async (name, email, password) => {
    const res = await authService.register(email, password);
    const data = res.data;
    localStorage.setItem('token', data.token);
    await userService.create({ name, email, balance: 10000 });
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setPendingTotp(null);
  };

  const refreshUser = () => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, pendingTotp, verifyTotp, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
