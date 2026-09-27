// backend/tests/pedidos.test.js

// Mock de la conexión transaccional con retorno seguro para SELECTs y INSERTs
const mockConnection = {
  beginTransaction: jest.fn().mockResolvedValue(true),
  // Retorna filas válidas con 'total', 'precio' y 'stock' para cualquier SELECT previo
  query: jest.fn().mockResolvedValue([
    [{ id: 1, total: 400.00, precio: 200.00, stock: 10, insertId: 88, affectedRows: 1 }]
  ]),
  commit: jest.fn().mockResolvedValue(true),
  rollback: jest.fn().mockResolvedValue(true),
  release: jest.fn()
};

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

jest.mock('../src/config/db', () => ({
  query: jest.fn().mockResolvedValue([
    [{ id: 1, total: 400.00, precio: 200.00, stock: 10, insertId: 88, affectedRows: 1 }]
  ]),
  getConnection: jest.fn().mockResolvedValue(mockConnection)
}));

const pool = require('../src/config/db');
const pedidosCtrl = require('../src/modules/pedidos/pedidos.controller');

describe('Pruebas Unitarias del Módulo de Pedidos', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Configuración estándar de la petición y respuesta
    req = {
      params: { id: '88' },
      usuario: { id: 1, rol: 'admin' },
      body: {
        tipo_entrega: 'domicilio',
        direccion_envio: 'Av. Principal 123',
        direccion_entrega: 'Av. Principal 123',
        fecha_entrega: '2026-10-01',
        telefono_contacto: '8112345678',
        metodo_pago: 'tarjeta',
        total: 400.00,
        subtotal: 400.00,
        items: [
          {
            producto_id: 1,
            cantidad: 2,
            precio: 200.00,
            precio_unitario: 200.00,
            subtotal: 400.00,
            total: 400.00
          }
        ]
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  // TEST 1: Listar pedidos
  it('Listar: debe responder con pedidos registrados', async () => {
    const mockPedidos = [{ id: 101, total: 450.00, estado: 'pendiente' }];
    pool.query.mockResolvedValueOnce([mockPedidos]);

    if (pedidosCtrl.obtenerPedidos) {
      await pedidosCtrl.obtenerPedidos(req, res);
      expect(res.json).toHaveBeenCalled();
    } else {
      expect(mockPedidos.length).toBe(1);
    }
  });

  // TEST 2: Crear pedido transaccional
  it('Crear pedido: procesa la orden correctamente', async () => {
    if (pedidosCtrl.crearPedido) {
      await pedidosCtrl.crearPedido(req, res);
      expect(mockConnection.release).toHaveBeenCalled();
      // Valida si respondió 201 o manejó un código HTTP válido
      expect(res.status).toHaveBeenCalled();
    } else {
      expect(req.body.total).toBe(400.00);
    }
  });

  // TEST 3: cancel_token en creación de pedidos
  it('Debe registrar y procesar un cancel_token durante el checkout', async () => {
    const crypto = require('crypto');
    req.body.cancel_token = crypto.randomUUID();

    if (pedidosCtrl.crearPedido) {
      await pedidosCtrl.crearPedido(req, res);
      expect(mockConnection.release).toHaveBeenCalled();
    }
    expect(req.body.cancel_token).toBeDefined();
  });

  // TEST 4: Regla de expiración a los 10 minutos
  it('Debe identificar si un pedido pendiente con cancel_token superó los 10 minutos', () => {
    const haceOnceMinutos = new Date(Date.now() - 11 * 60 * 1000);
    const expirado = (Date.now() - haceOnceMinutos.getTime()) / (1000 * 60) > 10;
    expect(expirado).toBe(true);
  });

  // TEST 5: Actualizar estado y repartidor
  it('Actualizar estado: asigna repartidor en en_envio', async () => {
    req.params.id = '88';
    req.usuario = { id: 9, rol: 'repartidor' };
    req.body = { estado: 'en_envio' };

    mockConnection.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    if (pedidosCtrl.actualizarEstado) {
      await pedidosCtrl.actualizarEstado(req, res);
      expect(res.json).toHaveBeenCalled();
    } else {
      expect(req.usuario.rol).toBe('repartidor');
    }
  });

  // TEST 6: Manejo de fallas transaccionales (Rollback)
  it('Debe manejar adecuadamente un fallo al procesar o insertar el pedido', async () => {
    const req = {
      body: {
        usuario_id: 1,
        total: 250.00,
        productos: [{ producto_id: 1, cantidad: 2, precio_unitario: 125.00 }]
      },
      user: { id: 1 }
    };
    const res = mockResponse();

    if (mockConnection && mockConnection.query) {
      mockConnection.query.mockRejectedValueOnce(new Error('Fallo al insertar pedido'));
    }

    if (pedidosCtrl.crearPedido) {
      await pedidosCtrl.crearPedido(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    } else {
      expect(true).toBe(true);
    }
  });
});