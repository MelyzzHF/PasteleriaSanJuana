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

  // ==========================================
  // COBERTURA FALTANTE: crearPedido (Validaciones)
  // ==========================================
  
  it('crearPedido: rechaza si el arreglo de items está vacío', async () => {
    const req = crearReq({ body: { items: [] } });
    await pedidosCtrl.crearPedido(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ mensaje: 'No hay productos en el pedido' });
  });

  it('crearPedido: rechaza si el tipo de entrega es inválido', async () => {
    const req = crearReq({ body: { tipo_entrega: 'dron', items : ['dron1', 'dron2'] } });
    await pedidosCtrl.crearPedido(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ mensaje: 'El tipo de entrega no es válido' });
  });

  it('crearPedido: rechaza si la fecha cae en domingo', async () => {
    const req = crearReq();
    // Forzamos un domingo (ej. 2026-10-04)
    req.body.fecha_entrega = '2026-10-04T10:00:00';
    await pedidosCtrl.crearPedido(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ mensaje: 'No se reciben pedidos para el día domingo.' });
  });

  it('crearPedido: rechaza un horario fuera del rango de atención', async () => {
    const req = crearReq();
    req.body.fecha_entrega = fechaEntregaValida().replace('T10:00:00', 'T23:00:00');
    await pedidosCtrl.crearPedido(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensaje: expect.stringContaining('horario de entrega es') }));
  });

  it('crearPedido: responde 409 si el cupo POR HORA está lleno', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ total: 0 }]]) // Cupo diario OK
      .mockResolvedValueOnce([[{ total: 2 }]]); // Cupo hora LLENO

    await pedidosCtrl.crearPedido(crearReq(), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensaje: expect.stringContaining('ya no tiene cupo') }));
  });

  it('crearPedido: responde 404 si un producto no existe en la BD', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ total: 0 }]]) // Cupo diario
      .mockResolvedValueOnce([[{ total: 0 }]]) // Cupo hora
      .mockResolvedValueOnce([[]]);            // Producto NO existe

    await pedidosCtrl.crearPedido(crearReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensaje: expect.stringContaining('no existe') }));
  });

  // ==========================================
  // COBERTURA FALTANTE: declinarPedidoInterrumpido
  // ==========================================

  it('declinarPedidoInterrumpido: responde 400 si falta el cancelToken', async () => {
    await pedidosCtrl.declinarPedidoInterrumpido(crearReq({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('declinarPedidoInterrumpido: responde 404 si el pedido no existe', async () => {
    mockConnection.query.mockResolvedValueOnce([[]]);
    const req = crearReq({ body: { cancelToken: 'abc' } });
    await pedidosCtrl.declinarPedidoInterrumpido(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('declinarPedidoInterrumpido: declina exitosamente (200) un pedido válido', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ id: 88, estado: 'pendiente', cancel_token: 'token-correcto' }]]) // Select
      .mockResolvedValueOnce([{}]) // Update pedidos
      .mockResolvedValueOnce([{}]); // Reponer stock (Update productos)

    const req = crearReq({ body: { cancelToken: 'token-correcto' } });
    await pedidosCtrl.declinarPedidoInterrumpido(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  // ==========================================
  // COBERTURA FALTANTE: Consultas (Cocina, Repartidor, Mis Pedidos)
  // ==========================================

  it('obtenerMisPedidos: devuelve [] si el usuario no tiene pedidos', async () => {
    pool.query
      .mockResolvedValueOnce([[]]) // expirar
      .mockResolvedValueOnce([[]]); // sin pedidos

    await pedidosCtrl.obtenerMisPedidos(crearReq(), res);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('obtenerPedidosCocina: devuelve la lista de pedidos', async () => {
    pool.query
      .mockResolvedValueOnce([[]]) // expirar
      .mockResolvedValueOnce([[{ id: 1, estado: 'recibido' }]]);

    await pedidosCtrl.obtenerPedidosCocina(crearReq(), res);
    expect(res.json).toHaveBeenCalledWith(expect.any(Array));
  });

  it('obtenerPedidosRepartidor: devuelve la lista de pedidos', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 2, estado: 'listo' }]]);
    await pedidosCtrl.obtenerPedidosRepartidor(crearReq(), res);
    expect(res.json).toHaveBeenCalledWith(expect.any(Array));
  });

  // ==========================================
  // COBERTURA FALTANTE: actualizarEstadoPedido
  // ==========================================

  it('actualizarEstadoPedido: responde 400 si el estado es inválido', async () => {
    const req = crearReq({ body: { nuevo_estado: 'estado_inventado' } });
    await pedidosCtrl.actualizarEstadoPedido(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('actualizarEstadoPedido: responde 404 si no se afecta ninguna fila', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
    const req = crearReq({ body: { nuevo_estado: 'en_preparacion' } });
    await pedidosCtrl.actualizarEstadoPedido(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  // ==========================================
  // COBERTURA FALTANTE: obtenerProductoPorId
  // ==========================================

  it('obtenerProductoPorId: responde 200 con el producto', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, nombre: 'Pastel' }]]);
    await pedidosCtrl.obtenerProductoPorId(crearReq(), res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Pastel' }));
  });

  it('obtenerProductoPorId: responde 404 si no existe', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    await pedidosCtrl.obtenerProductoPorId(crearReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  // ==========================================
  // COBERTURA FALTANTE: cancelarORechazarPedido
  // ==========================================

  it('cancelarORechazarPedido: responde 404 si no existe el pedido', async () => {
    mockConnection.query.mockResolvedValueOnce([[]]);
    await pedidosCtrl.cancelarORechazarPedido(crearReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('cancelarORechazarPedido: responde 403 si un cliente intenta cancelar el pedido de otro', async () => {
    mockConnection.query.mockResolvedValueOnce([[{ id: 88, usuario_id: 999, estado: 'recibido' }]]);
    await pedidosCtrl.cancelarORechazarPedido(crearReq({ usuario: { id: 1, rol: 'cliente' } }), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('cancelarORechazarPedido: responde 400 si ya está en estado final', async () => {
    mockConnection.query.mockResolvedValueOnce([[{ id: 88, usuario_id: 1, estado: 'entregado' }]]);
    await pedidosCtrl.cancelarORechazarPedido(crearReq(), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('cancelarORechazarPedido: éxito (200) para Admin cambia a rechazado', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ id: 88, usuario_id: 1, estado: 'recibido' }]]) // SELECT
      .mockResolvedValueOnce([{}]) // UPDATE pedidos
      .mockResolvedValueOnce([{}]) // UPDATE pagos
      .mockResolvedValueOnce([{}]); // Reponer stock
    
    await pedidosCtrl.cancelarORechazarPedido(crearReq({ usuario: { id: 2, rol: 'admin' } }), res);
    
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ estado: 'rechazado' }));
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  // ==========================================
  // COBERTURA FALTANTE: Disponibilidad
  // ==========================================

  it('obtenerDisponibilidad: responde 400 si falta la fecha', async () => {
    await pedidosCtrl.obtenerDisponibilidad(crearReq({ query: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('obtenerDisponibilidad: responde 200 con la disponibilidad del día', async () => {
    // Simulamos respuesta de consultas COUNT
    pool.query
      .mockResolvedValueOnce([[{ total: 2 }]]) // Domicilio Día
      .mockResolvedValueOnce([[{ hora: 10, total: 1 }]]) // Domicilio Hora
      .mockResolvedValueOnce([[{ total: 1 }]]) // Sucursal Día
      .mockResolvedValueOnce([[{ hora: 11, total: 1 }]]); // Sucursal Hora

    await pedidosCtrl.obtenerDisponibilidad(crearReq({ query: { fecha: fechaEntregaValida().slice(0, 10) } }), res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ fecha: expect.any(String), domicilio: expect.any(Object) }));
  });

  it('obtenerProximaFechaDisponible: responde 400 si tipo de entrega no es válido', async () => {
    await pedidosCtrl.obtenerProximaFechaDisponible(crearReq({ query: { tipo_entrega: 'magia' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('obtenerProximaFechaDisponible: responde 200 con la próxima fecha', async () => {
    // Al iterar, simulamos que el primer día intentado está lleno, y el segundo tiene lugar
    pool.query
      .mockResolvedValueOnce([[{ total: 10 }]])
      .mockResolvedValueOnce([[{ total: 1 }]]);
      
    await pedidosCtrl.obtenerProximaFechaDisponible(crearReq({ query: { tipo_entrega: 'domicilio', desde: fechaEntregaValida().slice(0, 10) } }), res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ fecha: expect.any(String) }));
  });

});