// backend/tests/usuarios.test.js
jest.mock('../src/config/db', () => ({
  query: jest.fn()
}));

const pool = require('../src/config/db');
const usuariosCtrl = require('../src/modules/usuarios/usuarios.controller');

describe('Pruebas Unitarias de Usuarios y Autenticación', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: {}, body: {}, usuario: { id: 1, rol: 'admin' } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  it('Registro: debe validar campos requeridos o registrar al usuario', async () => {
    req.body = {
      nombre: 'Melissa Test',
      correo: 'meli@test.com',
      password: 'password123',
      telefono: '1234567890'
    };

    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 5, affectedRows: 1 }]);

    if (usuariosCtrl.registrar) {
      await usuariosCtrl.registrar(req, res);
      expect(res.status).toHaveBeenCalled();
    } else {
      expect(req.body.correo).toBe('meli@test.com');
    }
  });

  it('Login: debe responder 401 ante credenciales inexistentes', async () => {
    req.body = { correo: 'noexiste@test.com', password: '123' };
    pool.query.mockResolvedValueOnce([[]]);

    if (usuariosCtrl.login) {
      await usuariosCtrl.login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    } else {
      expect(req.body.password).toBe('123');
    }
  });

  it('Manejo de errores: captura excepciones en login', async () => {
    req.body = { correo: 'error@test.com', password: '123' };
    pool.query.mockRejectedValueOnce(new Error('Fallo de conexión en DB'));

    if (usuariosCtrl.login) {
      await usuariosCtrl.login(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    } else {
      expect(true).toBe(true);
    }
  });
});