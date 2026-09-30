// backend/tests/pedidos.test.js
const mockConnection = {
  beginTransaction: jest.fn(),
  query: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn()
};

jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn()
}));

const pool = require('../src/config/db');
const pedidosCtrl = require('../src/modules/pedidos/pedidos.controller');

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => { });
});

afterAll(() => {
  jest.restoreAllMocks();
});

// Fecha válida: 3+ días adelante, nunca domingo, 10:00, en hora local
function fechaEntregaValida() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}T10:00:00`;
}

function crearReq(overrides = {}) {
  return {
    params: { id: '88' },
    usuario: { id: 1, rol: 'cliente' },
    body: {
      tipo_entrega: 'domicilio',
      direccion_envio: 'Av. Principal 123',
      fecha_entrega: fechaEntregaValida(),
      total: 400,
      items: [{ producto_id: 1, cantidad: 2, precio_unitario: 200 }]
    },
    ...overrides
  };
}

// Orden de queries de crearPedido: cupo día, cupo hora, stock, INSERT pedido, UPDATE stock, INSERT detalle
function simularCreacionExitosa() {
  mockConnection.query
    .mockResolvedValueOnce([[{ total: 0 }]])
    .mockResolvedValueOnce([[{ total: 0 }]])
    .mockResolvedValueOnce([[{ nombre: 'Pastel', stock: 10 }]])
    .mockResolvedValueOnce([{ insertId: 88 }])
    .mockResolvedValueOnce([{}])
    .mockResolvedValueOnce([{}]);
}

describe('Pruebas Unitarias del Módulo de Pedidos', () => {
  let res;

  beforeEach(() => {
    pool.query.mockReset();
    pool.getConnection.mockReset();
    pool.getConnection.mockResolvedValue(mockConnection);
    Object.values(mockConnection).forEach((fn) => fn.mockReset());
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  });

  it('obtenerMisPedidos: devuelve los pedidos del usuario con sus items', async () => {
    pool.query
      .mockResolvedValueOnce([[]]) // expirarPedidosVencidos
      .mockResolvedValueOnce([[{ id: 101, total: 450, estado: 'pendiente' }]])
      .mockResolvedValueOnce([[{ pedido_id: 101, cantidad: 2, precio_unitario: 225, nombre: 'Pastel' }]]);

    await pedidosCtrl.obtenerMisPedidos(crearReq(), res);

    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 101,
        items: [expect.objectContaining({ nombre: 'Pastel' })]
      })
    ]);
  });

  it('crearPedido: crea el pedido y responde 201 con el id', async () => {
    simularCreacionExitosa();

    await pedidosCtrl.crearPedido(crearReq(), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ pedidoId: 88 }));
    expect(mockConnection.commit).toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalledTimes(1);
  });

  it('crearPedido: genera un cancelToken único y lo devuelve al cliente', async () => {
    simularCreacionExitosa();

    await pedidosCtrl.crearPedido(crearReq(), res);

    const respuesta = res.json.mock.calls[0][0];
    expect(respuesta.cancelToken).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('crearPedido: rechaza una fecha sin anticipación sin abrir transacción', async () => {
    const req = crearReq();
    req.body.fecha_entrega = '2020-01-01T10:00:00';

    await pedidosCtrl.crearPedido(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockConnection.beginTransaction).not.toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it('crearPedido: responde 409 y hace rollback si el cupo del día está lleno', async () => {
    mockConnection.query.mockResolvedValueOnce([[{ total: 10 }]]);
    pool.query.mockResolvedValueOnce([[{ total: 0 }]]); // buscarProximaFechaDisponible

    await pedidosCtrl.crearPedido(crearReq(), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockConnection.rollback).toHaveBeenCalled();
    expect(mockConnection.commit).not.toHaveBeenCalled();
  });

  it('crearPedido: responde 400 si no hay stock suficiente', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ total: 0 }]])
      .mockResolvedValueOnce([[{ total: 0 }]])
      .mockResolvedValueOnce([[{ nombre: 'Pastel', stock: 1 }]]);

    await pedidosCtrl.crearPedido(crearReq(), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockConnection.rollback).toHaveBeenCalled();
  });

  it('crearPedido: ante un fallo de BD hace rollback, responde 500 y libera la conexión', async () => {
    mockConnection.query.mockRejectedValueOnce(new Error('Fallo al insertar pedido'));

    await pedidosCtrl.crearPedido(crearReq(), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(mockConnection.rollback).toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalledTimes(1);
  });

  it('expirarPedidosVencidos: cancela el pedido pendiente y repone el stock', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 5 }]]);
    mockConnection.query
      .mockResolvedValueOnce([[{ id: 5 }]]) // SELECT ... FOR UPDATE
      .mockResolvedValueOnce([{}])          // UPDATE productos (JOIN)
      .mockResolvedValueOnce([{}]);         // UPDATE pedidos

    await pedidosCtrl.expirarPedidosVencidos();

    // El stock se repone con una sola consulta, usando el id del pedido
    expect(mockConnection.query).toHaveBeenCalledWith(
      expect.stringContaining('p.stock = p.stock + d.total'),
      [5]
    );
    // El pedido queda cancelado con el motivo de expiración
    expect(mockConnection.query).toHaveBeenCalledWith(
      expect.stringContaining("estado = 'cancelado'"),
      ['Pago no completado (tiempo de espera agotado).', 5]
    );
    expect(mockConnection.commit).toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalledTimes(1);
  });

  it('declinarPedidoInterrumpido: responde 409 si el cancelToken no coincide', async () => {
    mockConnection.query.mockResolvedValueOnce([
      [{ id: 88, estado: 'pendiente', cancel_token: 'token-correcto' }]
    ]);
    const req = crearReq({ body: { cancelToken: 'token-falso' } });

    await pedidosCtrl.declinarPedidoInterrumpido(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockConnection.rollback).toHaveBeenCalled();
  });

  it('actualizarEstadoPedido: asigna el repartidor al pasar a en_envio', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const req = crearReq({
      usuario: { id: 9, rol: 'repartidor' },
      body: { nuevo_estado: 'en_envio' }
    });

    await pedidosCtrl.actualizarEstadoPedido(req, res);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('repartidor_id'),
      ['en_envio', 9, '88']
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ repartidor_id: 9 }));
  });
});