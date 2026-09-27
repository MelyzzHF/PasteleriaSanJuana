// backend/tests/api.test.js
const request = require('supertest');
const app = require('../server');

describe('Pruebas Básicas de la API (CI Pipeline)', () => {
  // 1. Probar el endpoint de salud
  it('GET /api/health debe responder 200 y status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  // 2. Probar que una ruta protegida rechace peticiones sin autenticación
  it('GET /api/pedidos debe retornar 401 si no se envía token', async () => {
    const res = await request(app).get('/api/pedidos');
    expect(res.statusCode).toBe(401);
  });

  // 3. Probar ruta inexistente (404)
  it('GET /api/ruta-fantasma debe retornar 404', async () => {
    const res = await request(app).get('/api/ruta-fantasma');
    expect(res.statusCode).toBe(404);
  });
});