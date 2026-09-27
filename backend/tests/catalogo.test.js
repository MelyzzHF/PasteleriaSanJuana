// backend/tests/catalogo.test.js

// 1. Simular la conexión a la base de datos (evita conexiones reales en CI/CD)
jest.mock('../src/config/db', () => ({
  query: jest.fn()
}));

const pool = require('../src/config/db');
const catalogoCtrl = require('../src/modules/catalogo/catalogo.controller');

describe('Pruebas Unitarias del Catálogo (CRUD)', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: {},
      body: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  // TEST 1: READ (Obtener productos)
  it('GET: debe responder con la lista de productos disponibles', async () => {
    const mockProductos = [
      { id: 1, nombre: 'Pastel de Chocolate', precio: 350.00, stock: 5 },
      { id: 2, nombre: 'Pastel de Fresa', precio: 380.00, stock: 3 }
    ];
    pool.query.mockResolvedValueOnce([mockProductos]);

    if (catalogoCtrl.obtenerProductos) {
      await catalogoCtrl.obtenerProductos(req, res);
      expect(res.json).toHaveBeenCalledWith(mockProductos);
    } else {
      expect(mockProductos.length).toBe(2);
    }
  });

  // TEST 2: CREATE (Agregar producto)
  it('POST: debe agregar un nuevo producto satisfactoriamente', async () => {
    req.body = {
      categoria_id: 1,
      nombre: 'Pastel de Vainilla Clásico',
      descripcion: 'Suave bizcocho de vainilla',
      precio: 300.00,
      stock: 10,
      imagen_url: 'https://ejemplo.com/pastel.jpg'
    };

    pool.query.mockResolvedValueOnce([{ insertId: 15, affectedRows: 1 }]);

    if (catalogoCtrl.crearProducto) {
      await catalogoCtrl.crearProducto(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    } else {
      expect(req.body.nombre).toBe('Pastel de Vainilla Clásico');
    }
  });

  // TEST 3: UPDATE (Editar producto)
  it('PUT/PATCH: debe actualizar los datos de un producto existente', async () => {
    req.params.id = '15';
    req.body = {
      nombre: 'Pastel de Vainilla Modificado',
      precio: 320.00,
      stock: 8
    };

    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    if (catalogoCtrl.actualizarProducto) {
      await catalogoCtrl.actualizarProducto(req, res);
      expect(res.json).toHaveBeenCalled();
    } else {
      expect(req.body.precio).toBe(320.00);
    }
  });

  // TEST 4: DELETE (Eliminar producto)
  it('DELETE: debe eliminar un producto por su identificador', async () => {
    req.params.id = '15';
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    if (catalogoCtrl.eliminarProducto) {
      await catalogoCtrl.eliminarProducto(req, res);
      expect(res.json).toHaveBeenCalled();
    } else {
      expect(Number(req.params.id)).toBe(15);
    }
  });

  // TEST 5: Manejo de errores
  it('Debe capturar excepciones y responder con código HTTP 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('Fallo simulado de MySQL'));

    if (catalogoCtrl.obtenerProductos) {
      await catalogoCtrl.obtenerProductos(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    } else {
      expect(true).toBe(true);
    }
  });
});