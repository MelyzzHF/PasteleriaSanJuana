// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const AuthContext = createContext();

const CLAVE_TOKEN = 'token';
const CLAVE_USUARIO = 'usuario';
const CLAVE_USUARIO_ALIAS = 'user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(CLAVE_USUARIO) || localStorage.getItem(CLAVE_USUARIO_ALIAS);
      const storedToken = localStorage.getItem(CLAVE_TOKEN);
      if (storedUser && storedToken) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      }
    } catch (err) {
      console.error('No se pudo leer la sesión guardada:', err);
    } finally {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCargando(false);
    }
  }, []);

  const login = useCallback((userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem(CLAVE_TOKEN, userToken);
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(userData));
    localStorage.setItem(CLAVE_USUARIO_ALIAS, JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
    localStorage.removeItem(CLAVE_USUARIO_ALIAS);
    window.location.href = '/';
  }, []);

  const value = useMemo(
    () => ({ user, token, cargando, login, logout }),
    [user, token, cargando, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);