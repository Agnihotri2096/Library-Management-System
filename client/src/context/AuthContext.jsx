import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

function decodeToken(token) {
  try { return JSON.parse(atob(token.split('.')[1])); }
  catch { return null; }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('lms_token') || null);
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('lms_user')); } catch { return null; }
  });

  // Decode role from JWT as source of truth (so even old stored users work)
  const _payload   = token ? decodeToken(token) : null;
  const isLoggedIn = !!_payload && _payload.exp > Date.now() / 1000;
  // Merge JWT payload role into user object so guards always see role correctly
  const resolvedUser = user && _payload ? { ..._payload, ...user, role: _payload.role } : user;

  const login = useCallback((newToken, newUser) => {
    localStorage.setItem('lms_token', newToken);
    localStorage.setItem('lms_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('lms_token');
    localStorage.removeItem('lms_user');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    const updated = { ...user, ...patch };
    localStorage.setItem('lms_user', JSON.stringify(updated));
    setUser(updated);
  }, [user]);

  return (
    <AuthContext.Provider value={{ token, user: resolvedUser, isLoggedIn, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
