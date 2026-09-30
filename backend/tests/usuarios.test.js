// backend/tests/usuarios.test.js
jest.mock('../src/config/db', () => ({ query: jest.fn() }));

// Se mockea bcryptjs para que los tests sean rápidos y deterministas
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hash-simulado'),
  compare: jest.fn()
}));

const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');
const usuariosCtrl = require('../src/modules/usuarios/usuarios.controller');

describe('Pruebas Unitarias de Usuarios y Autenticación', () => {
  let req, res;

  beforeEach(() => {
    pool.query.mockReset();
    bcrypt.compare.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    req = { params: {}, body: {}, usuario: { id: 1, rol: 'admin' } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------- Registro ----------------
  it('registrarUsuario: crea al usuario cuando el correo no existe', async () => {
    req.body = {
      nombre: 'Melissa', apellidos: 'Gómez', email: 'Meli@Test.com',
      password: 'password123', telefono: '8112345678'
    };
    pool.query
      .mockResolvedValueOnce([[]])                              // correo no existe
      .mockResolvedValueOnce([{ insertId: 5, affectedRows: 1 }]); // INSERT

    await usuariosCtrl.registrarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.any(String),
        usuario: expect.objectContaining({ id: 5, email: 'meli@test.com', rol: 'cliente' })
      })
    );
  });

  it('registrarUsuario: responde 400 si faltan campos obligatorios', async () => {
    req.body = { nombre: 'Melissa', email: 'meli@test.com' };

    await usuariosCtrl.registrarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('registrarUsuario: responde 400 si el teléfono no tiene 10 dígitos', async () => {
    req.body = {
      nombre: 'Melissa', apellidos: 'Gómez', email: 'meli@test.com',
      password: 'password123', telefono: '12345'
    };

    await usuariosCtrl.registrarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('registrarUsuario: responde 409 si el correo ya está registrado', async () => {
    req.body = {
      nombre: 'Melissa', apellidos: 'Gómez', email: 'meli@test.com',
      password: 'password123', telefono: '8112345678'
    };
    pool.query.mockResolvedValueOnce([[{ id: 2 }]]);

    await usuariosCtrl.registrarUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  // ---------------- Login ----------------
  it('loginUsuario: responde 401 ante credenciales inexistentes', async () => {
    req.body = { email: 'noexiste@test.com', password: '123456' };
    pool.query.mockResolvedValueOnce([[]]);

    await usuariosCtrl.loginUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('loginUsuario: responde 401 si la contraseña es incorrecta', async () => {
    req.body = { email: 'meli@test.com', password: 'mala-clave' };
    pool.query.mockResolvedValueOnce([[{ id: 1, email: 'meli@test.com', password: 'hash', rol: 'cliente' }]]);
    bcrypt.compare.mockResolvedValueOnce(false);

    await usuariosCtrl.loginUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('loginUsuario: devuelve token y usuario (sin password) si las credenciales son correctas', async () => {
    req.body = { email: 'meli@test.com', password: 'password123' };
    pool.query.mockResolvedValueOnce([[{
      id: 1, nombre: 'Melissa Gómez', email: 'meli@test.com',
      telefono: '8112345678', password: 'hash', rol: 'cliente'
    }]]);
    bcrypt.compare.mockResolvedValueOnce(true);

    await usuariosCtrl.loginUsuario(req, res);

    const respuesta = res.json.mock.calls[0][0];
    expect(respuesta.token).toEqual(expect.any(String));
    expect(respuesta.usuario).toEqual(expect.objectContaining({ id: 1, rol: 'cliente' }));
    expect(respuesta.usuario.password).toBeUndefined();
  });

  it('loginUsuario: responde 400 si falta correo o contraseña', async () => {
    req.body = { email: 'meli@test.com' };

    await usuariosCtrl.loginUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('loginUsuario: responde 500 si la base de datos falla', async () => {
    req.body = { email: 'error@test.com', password: '123456' };
    pool.query.mockRejectedValueOnce(new Error('Fallo de conexión en DB'));

    await usuariosCtrl.loginUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ---------------- Empleados ----------------
  it('eliminarEmpleado: no permite que el admin se elimine a sí mismo', async () => {
    req.params.id = '1';

    await usuariosCtrl.eliminarEmpleado(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('crearEmpleado: responde 400 si el rol no es válido', async () => {
    req.body = { nombre: 'Ana', email: 'ana@test.com', password: 'password123', rol: 'cliente' };

    await usuariosCtrl.crearEmpleado(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});