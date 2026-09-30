// backend/tests/pagos.test.js
const pool = require('../src/config/db');
const pagosCtrl = require('../src/modules/pagos/pagos.controller');

// Simulamos la base de datos
jest.mock('../src/config/db', () => ({
  query: jest.fn()
}));

// Silenciamos los console.error para tener una terminal limpia durante las pruebas
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

// Función de ayuda para crear objetos Request y Response falsos
function crearMocks() {
  const req = {
    body: {},
    params: {}
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return { req, res };
}

describe('Pruebas Unitarias del Controlador de Pagos', () => {
  
  beforeEach(() => {
    pool.query.mockReset();
  });

  describe('procesarPagoSimulado', () => {
    it('Debe aprobar una tarjeta válida y actualizar el pedido a recibido (201)', async () => {
      const { req, res } = crearMocks();
      req.body = {
        pedido_id: 1,
        metodo_pago: 'tarjeta',
        monto: 500,
        datos_tarjeta: { numero: '1234567812345678' } // No termina en 0000
      };

      // Simula el INSERT en pagos y el UPDATE en pedidos
      pool.query
        .mockResolvedValueOnce([{ insertId: 99 }]) 
        .mockResolvedValueOnce([{}]);

      await pagosCtrl.procesarPagoSimulado(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        estado: 'completado',
        pago_id: 99
      }));
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('Debe rechazar una tarjeta que termine en 0000 y cancelar el pedido (400)', async () => {
      const { req, res } = crearMocks();
      req.body = {
        pedido_id: 2,
        metodo_pago: 'tarjeta',
        monto: 500,
        datos_tarjeta: { numero: '4111222233330000' }
      };

      pool.query
        .mockResolvedValueOnce([{ insertId: 100 }])
        .mockResolvedValueOnce([{}]);

      await pagosCtrl.procesarPagoSimulado(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        mensaje: expect.stringContaining('declinado')
      }));
    });

    it('Debe procesar correctamente un pago por transferencia (201)', async () => {
      const { req, res } = crearMocks();
      req.body = { pedido_id: 3, metodo_pago: 'transferencia', monto: 300 };

      pool.query.mockResolvedValue([{}]); // Responde a todos los queries

      await pagosCtrl.procesarPagoSimulado(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        estado: 'pendiente',
        referencia_transaccion: expect.stringContaining('SPEI-')
      }));
    });

    it('Debe procesar correctamente un pago en efectivo (201)', async () => {
      const { req, res } = crearMocks();
      req.body = { pedido_id: 4, metodo_pago: 'efectivo', monto: 150 };

      pool.query.mockResolvedValue([{}]);

      await pagosCtrl.procesarPagoSimulado(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        estado: 'pendiente',
        referencia_transaccion: 'EFECTIVO-CONTRAENTREGA'
      }));
    });

    it('Debe manejar un método de pago desconocido por defecto (201)', async () => {
      const { req, res } = crearMocks();
      req.body = { pedido_id: 5, metodo_pago: 'cripto', monto: 100 };

      pool.query.mockResolvedValue([{}]);

      await pagosCtrl.procesarPagoSimulado(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        estado: 'pendiente',
        referencia_transaccion: null
      }));
    });

    it('Debe responder 500 si la base de datos falla al procesar el pago', async () => {
      const { req, res } = crearMocks();
      req.body = { pedido_id: 6, metodo_pago: 'efectivo', monto: 100 };

      pool.query.mockRejectedValueOnce(new Error('Fallo de BD'));

      await pagosCtrl.procesarPagoSimulado(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al procesar el pago' });
    });
  });

  describe('obtenerPagoPorPedido', () => {
    it('Debe devolver los datos del pago si existe (200)', async () => {
      const { req, res } = crearMocks();
      req.params.pedidoId = 10;
      
      const pagoFalso = { id: 1, pedido_id: 10, estado: 'completado' };
      pool.query.mockResolvedValueOnce([[pagoFalso]]);

      await pagosCtrl.obtenerPagoPorPedido(req, res);

      expect(res.json).toHaveBeenCalledWith(pagoFalso);
    });

    it('Debe responder 404 si el pedido no tiene pagos registrados', async () => {
      const { req, res } = crearMocks();
      req.params.pedidoId = 20;
      
      pool.query.mockResolvedValueOnce([[]]); // Arreglo vacío

      await pagosCtrl.obtenerPagoPorPedido(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se encontró registro de pago para este pedido' });
    });

    it('Debe responder 500 si la base de datos falla al consultar el pago', async () => {
      const { req, res } = crearMocks();
      req.params.pedidoId = 30;

      pool.query.mockRejectedValueOnce(new Error('Fallo de BD'));

      await pagosCtrl.obtenerPagoPorPedido(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al consultar el pago' });
    });
  });

});