export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const apiClient = async (endpoint, options = {}) => {
  // 1. Construimos la URL base asegurándonos del entorno actual
  const baseUrl = new URL(API_URL, window.location.origin);
  
  // 2. Unimos el endpoint a la base usando la API segura de URL
  const targetUrl = new URL(endpoint, baseUrl);

  // 🔥 3. Validación estricta: Si el endpoint intentó cambiar el dominio (ej. https://evil.com),
  // el origen no coincidirá y bloqueamos la petición para no filtrar el token.
  if (targetUrl.origin !== baseUrl.origin) {
    throw new Error('Endpoint inválido o inseguro detectado');
  }

  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Usamos el targetUrl sanitizado
  const response = await fetch(targetUrl.toString(), {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ocurrió un error en la petición');
  }

  return data;
};