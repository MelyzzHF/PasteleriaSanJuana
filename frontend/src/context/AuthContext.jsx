// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
const AuthContext = createContext();

// Mismas claves que ya usan Login.jsx, Catalogo.jsx y Checkout.jsx al leer
// localStorage directamente, para que todo el proyecto hable de la misma
// sesión. 'usuario' y 'user' se mantienen como alias del mismo valor por
// compatibilidad con el código existente que use cualquiera de los dos.
const CLAVE_TOKEN = 'token';
const CLAVE_USUARIO = 'usuario';
const CLAVE_USUARIO_ALIAS = 'user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Mientras esto es true, todavía no sabemos con certeza si hay sesión
  // guardada o no. Cualquier pantalla que decida redirigir al login basada
  // en "no hay usuario" debe esperar a que esto sea false antes de decidir,
  // o se dispara un redirect falso apenas se refresca la página.
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

  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem(CLAVE_TOKEN, userToken);
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(userData));
    localStorage.setItem(CLAVE_USUARIO_ALIAS, JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
    localStorage.removeItem(CLAVE_USUARIO_ALIAS);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, token, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);