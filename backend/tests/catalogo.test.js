// backend/tests/catalogo.test.js
jest.mock('../src/config/db', () => ({ query: jest.fn() }));

const pool = require('../src/config/db');
const catalogoCtrl = require('../src/modules/catalogo/catalogo.controller');

describe('Pruebas Unitarias del Catálogo (CRUD)', () => {
  let req, res;

  beforeEach(() => {
    pool.query.mockReset();
    req = { params: {}, body: {}, query: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  });

  it('GET: responde con la lista de productos', async () => {
    const mockProductos = [
      { id: 1, nombre: 'Pastel de Chocolate', precio: 350, stock: 5 },
      { id: 2, nombre: 'Pastel de Fresa', precio: 380, stock: 3 }
    ];
    pool.query.mockResolvedValueOnce([mockProductos]);

    await catalogoCtrl.obtenerProductos(req, res);

    expect(res.json).toHaveBeenCalledWith(mockProductos);
  });

  it('POST: agrega un nuevo producto', async () => {
    req.body = {
      categoria_id: 1, nombre: 'Pastel de Vainilla Clásico', descripcion: 'Suave bizcocho',
      precio: 300, stock: 10, imagen_url: 'https://ejemplo.com/pastel.jpg'
    };
    pool.query.mockResolvedValueOnce([{ insertId: 15, affectedRows: 1 }]);

    await catalogoCtrl.crearProducto(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('PUT: actualiza un producto existente', async () => {
    req.params.id = '15';
    req.body = { nombre: 'Pastel de Vainilla Modificado', precio: 320, stock: 8 };
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    await catalogoCtrl.actualizarProducto(req, res);

    expect(pool.query).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });

  it('DELETE: elimina un producto por id', async () => {
    req.params.id = '15';
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    await catalogoCtrl.eliminarProducto(req, res);

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['15']);
    expect(res.json).toHaveBeenCalled();
  });

  it('captura excepciones y responde 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('Fallo simulado de MySQL'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await catalogoCtrl.obtenerProductos(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});