export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const apiClient = async (endpoint, options = {}) => {
  const baseUrl = new URL(API_URL, window.location.origin);

  // Unimos base + endpoint conservando el prefijo /api
  const basePath = baseUrl.pathname.replace(/\/+$/, '');   // "/api"
  const endpointPath = String(endpoint).replace(/^\/+/, ''); // "catalogo/productos"
  const targetUrl = new URL(`${basePath}/${endpointPath}`, baseUrl.origin);

  // Sigue bloqueando cualquier intento de cambiar de dominio
  if (targetUrl.origin !== baseUrl.origin) {
    throw new Error('Endpoint inválido o inseguro detectado');
  }

  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

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