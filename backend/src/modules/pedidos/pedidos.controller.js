// backend/src/modules/pedidos/pedidos.controller.js
const crypto = require('node:crypto');
const pool = require('../../config/db');

// Cuánto tiempo (en minutos) puede quedarse un pedido en 'pendiente' sin que
// llegue la confirmación de pago antes de darlo por interrumpido/perdido.
const MINUTOS_EXPIRACION_PENDIENTE = 10;

// ---------------------------------------------------------------------
// Reglas de horario y cupo para la fecha/hora de entrega o recolección.
// ---------------------------------------------------------------------
const HORA_APERTURA = 9;   // 9:00 am, primera hora reservable
const HORA_CIERRE = 20;    // 20:00 (8pm), última hora reservable (cierra a las 9pm)
const CUPO_POR_HORA = 2;   // máximo de pedidos por hora
const CUPO_DIARIO_POR_TIPO = 10; // máximo de pedidos por tipo de entrega al día
const TIPOS_ENTREGA_VALIDOS = new Set(['domicilio', 'sucursal']);

// Solo cuentan como "ocupando cupo" los pedidos que siguen vivos.
const ESTADOS_QUE_OCUPAN_CUPO = "('pendiente','recibido','en_preparacion','listo','en_envio','entregado')";

function horasDelDia() {
  const horas = [];
  for (let h = HORA_APERTURA; h <= HORA_CIERRE; h++) {
    horas.push(h);
  }
  return horas;
}

function formatoFecha(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD (en UTC, ver nota abajo)
}

// Fecha mínima seleccionable: mañana (no se permite el mismo día).
function fechaMinima() {
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  return formatoFecha(manana);
}

// Valida una fecha+hora propuesta (fechaEntrega: 'YYYY-MM-DDTHH:00:00').
// No revisa cupos (eso requiere consultar la BD); solo las reglas "fijas".
function validarReglasFijas(fechaEntregaStr) {
  if (!fechaEntregaStr) {
    return 'Debes elegir una fecha y hora de entrega.';
  }

  const fecha = new Date(fechaEntregaStr);
  if (Number.isNaN(fecha.getTime())) {
    return 'La fecha de entrega no es válida.';
  }

  const soloFecha = fechaEntregaStr.slice(0, 10);
  if (soloFecha < fechaMinima()) {
    return 'Debes elegir una fecha con al menos un día de anticipación.';
  }

  if (fecha.getDay() === 0) {
    return 'No se reciben pedidos para el día domingo.';
  }

  const hora = fecha.getHours();
  if (hora < HORA_APERTURA || hora > HORA_CIERRE) {
    return `El horario de entrega es de ${HORA_APERTURA}:00 a ${HORA_CIERRE + 1}:00.`;
  }

  return null; // sin errores
}

// Busca, a partir de una fecha (inclusive), el primer día (que no sea
// domingo) en el que el tipo de entrega todavía tenga cupo diario libre.
async function buscarProximaFechaDisponible(tipoEntrega, desdeStr) {
  const cursor = new Date(`${desdeStr}T00:00:00`);

  for (let intento = 0; intento < 60; intento++) {
    if (cursor.getDay() !== 0) {
      const fechaStr = formatoFecha(cursor);
      const [filas] = await pool.query(
        `SELECT COUNT(*) AS total FROM pedidos
         WHERE tipo_entrega = ? AND DATE(fecha_entrega) = ? AND estado IN ${ESTADOS_QUE_OCUPAN_CUPO}`,
        [tipoEntrega, fechaStr]
      );
      if (filas[0].total < CUPO_DIARIO_POR_TIPO) {
        return fechaStr;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return null; // no se encontró en los próximos 60 días (caso extremo)
}

// ---------------------------------------------------------------------
// Helpers compartidos (stock)
// ---------------------------------------------------------------------

// Repone el stock de un pedido. Se usa al expirar, declinar y cancelar.
async function reponerStock(connection, pedidoId) {
  await connection.query(
    `UPDATE productos p
     JOIN (
       SELECT producto_id, SUM(cantidad) AS total
       FROM detalle_pedidos
       WHERE pedido_id = ?
       GROUP BY producto_id
     ) d ON d.producto_id = p.id
     SET p.stock = p.stock + d.total`,
    [pedidoId]
  );
}

// -----------------------------------------------------------------------
// Red de seguridad: cualquier pedido que se haya quedado en 'pendiente'
// (creado pero nunca se completó/rechazó el pago, por ejemplo porque se fue
// el internet a mitad del checkout) se declina automáticamente pasado
// MINUTOS_EXPIRACION_PENDIENTE, reponiendo el stock que se había reservado.
// Se llama de forma "perezosa" al inicio de las consultas de pedidos, así
// no depende de un cron ni de tocar el archivo de arranque del servidor.
// -----------------------------------------------------------------------
async function expirarPedido(pedidoId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Verificamos de nuevo dentro de la transacción por si ya cambió de
    // estado justo en este instante (por ejemplo, el pago sí llegó).
    const [filas] = await connection.query(
      `SELECT id FROM pedidos WHERE id = ? AND estado = 'pendiente' FOR UPDATE`,
      [pedidoId]
    );

    if (filas.length === 0) {
      await connection.rollback();
      return;
    }

    await reponerStock(connection, pedidoId);

    await connection.query(
      `UPDATE pedidos SET estado = 'cancelado', motivo_cancelacion = ? WHERE id = ?`,
      ['Pago no completado (tiempo de espera agotado).', pedidoId]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error(`No se pudo expirar el pedido #${pedidoId}:`, error);
  } finally {
    connection.release();
  }
}

async function expirarPedidosVencidos() {
  let idsVencidos;

  try {
    const [vencidos] = await pool.query(
      `SELECT id FROM pedidos
       WHERE estado = 'pendiente'
         AND creado_en < (NOW() - INTERVAL ? MINUTE)`,
      [MINUTOS_EXPIRACION_PENDIENTE]
    );
    idsVencidos = vencidos.map((v) => v.id);
  } catch (error) {
    console.error('Error al buscar pedidos vencidos:', error);
    return;
  }

  for (const pedidoId of idsVencidos) {
    await expirarPedido(pedidoId);
  }
}


// ---------------------------------------------------------------------
// Helpers de crearPedido
// ---------------------------------------------------------------------
function normalizarItem(item) {
  return {
    productoId: item.producto_id || item.productoId || item.id || item.id_producto,
    cantidad: Number(item.cantidad || item.quantity || 1),
    precioUnitario: Number(item.precio_unitario || item.precioUnitario || item.precio || item.price || 0)
  };
}

// Devuelve un string con el error, o null si la entrada es válida.
function validarEntradaPedido({ tipo_entrega, fecha_entrega, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'No hay productos en el pedido';
  }
  if (!TIPOS_ENTREGA_VALIDOS.has(tipo_entrega)) {
    return 'El tipo de entrega no es válido';
  }
  return validarReglasFijas(fecha_entrega);
}

function mensajeCupoDiaLleno(tipoEntrega, proxima) {
  const base = `Ya se completó el cupo de ${tipoEntrega} para ese día.`;
  return proxima ? `${base} La próxima fecha disponible es ${proxima}.` : base;
}

// Devuelve el cuerpo de la respuesta 409 si no hay cupo, o null si hay lugar.
// Bloquea las filas con FOR UPDATE para que dos personas reservando al mismo
// tiempo no se pasen del límite (REPEATABLE READ de MySQL protege
// razonablemente bien este caso, aunque no es 100% infalible bajo
// concurrencia extrema).
async function verificarCupos(connection, tipoEntrega, fechaEntrega) {
  const soloFecha = fechaEntrega.slice(0, 10);
  const horaEntrega = new Date(fechaEntrega).getHours();

  const [conteoDia] = await connection.query(
    `SELECT COUNT(*) AS total FROM pedidos
     WHERE tipo_entrega = ? AND DATE(fecha_entrega) = ? AND estado IN ${ESTADOS_QUE_OCUPAN_CUPO}
     FOR UPDATE`,
    [tipoEntrega, soloFecha]
  );

  if (conteoDia[0].total >= CUPO_DIARIO_POR_TIPO) {
    const proxima = await buscarProximaFechaDisponible(tipoEntrega, soloFecha);
    return {
      mensaje: mensajeCupoDiaLleno(tipoEntrega, proxima),
      proximaFechaDisponible: proxima
    };
  }

  const [conteoHora] = await connection.query(
    `SELECT COUNT(*) AS total FROM pedidos
     WHERE tipo_entrega = ? AND DATE(fecha_entrega) = ? AND HOUR(fecha_entrega) = ?
       AND estado IN ${ESTADOS_QUE_OCUPAN_CUPO}
     FOR UPDATE`,
    [tipoEntrega, soloFecha, horaEntrega]
  );

  if (conteoHora[0].total >= CUPO_POR_HORA) {
    return {
      mensaje: `Ese horario (${String(horaEntrega).padStart(2, '0')}:00) ya no tiene cupo. Elige otra hora.`
    };
  }

  return null;
}

// Devuelve { status, mensaje } si hay problema, o null si todo está bien.
async function validarStock(connection, items) {
  for (const item of items) {
    const { productoId, cantidad } = normalizarItem(item);

    const [filas] = await connection.query(
      'SELECT nombre, stock FROM productos WHERE id = ? FOR UPDATE',
      [productoId]
    );

    if (filas.length === 0) {
      return { status: 404, mensaje: `El producto con ID ${productoId} no existe.` };
    }

    const productoBD = filas[0];
    if (productoBD.stock < cantidad) {
      return {
        status: 400,
        mensaje: `Stock insuficiente para "${productoBD.nombre}". Disponibles: ${productoBD.stock}, solicitados: ${cantidad}.`
      };
    }
  }

  return null;
}

async function registrarDetalleYDescontarStock(connection, pedidoId, items) {
  const valoresDetalle = [];

  for (const item of items) {
    const { productoId, cantidad, precioUnitario } = normalizarItem(item);
    valoresDetalle.push([pedidoId, productoId, cantidad, precioUnitario]);

    await connection.query(
      'UPDATE productos SET stock = stock - ? WHERE id = ?',
      [cantidad, productoId]
    );
  }

  await connection.query(
    'INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario) VALUES ?',
    [valoresDetalle]
  );
}

// 1. Crear nuevo pedido (Checkout seguro con Transacción)
exports.crearPedido = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { tipo_entrega, direccion_envio, fecha_entrega, total, items } = req.body;
    const usuarioId = req.usuario.id;

    const errorEntrada = validarEntradaPedido({ tipo_entrega, fecha_entrega, items });
    if (errorEntrada) {
      return res.status(400).json({ mensaje: errorEntrada });
    }

    await connection.beginTransaction();

    // Revisamos y bloqueamos el cupo del día y de la hora ANTES de insertar.
    const errorCupo = await verificarCupos(connection, tipo_entrega, fecha_entrega);
    if (errorCupo) {
      await connection.rollback();
      return res.status(409).json(errorCupo);
    }

    // Validación de existencias antes de procesar
    const errorStock = await validarStock(connection, items);
    if (errorStock) {
      await connection.rollback();
      return res.status(errorStock.status).json({ mensaje: errorStock.mensaje });
    }

    // Token secreto de un solo uso que le entregamos al cliente para que,
    // si cierra o recarga la pestaña antes de que el pago se confirme,
    // pueda pedirnos que declinemos ESE pedido específico (ver
    // declinarPedidoInterrumpido más abajo).
    const cancelToken = crypto.randomUUID();

    const [pedidoResult] = await connection.query(
      `INSERT INTO pedidos (usuario_id, total, estado, direccion_envio, tipo_entrega, fecha_entrega, cancel_token)
       VALUES (?, ?, 'pendiente', ?, ?, ?, ?)`,
      [usuarioId, total || 0, direccion_envio || null, tipo_entrega, fecha_entrega, cancelToken]
    );

    const pedidoId = pedidoResult.insertId;

    await registrarDetalleYDescontarStock(connection, pedidoId, items);

    await connection.commit();

    res.status(201).json({
      mensaje: '¡Pedido creado exitosamente!',
      pedidoId,
      // El frontend guarda esto en memoria (nunca en la URL ni en logs) y lo
      // usa únicamente si el usuario cierra/recarga a mitad del pago.
      cancelToken
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error al crear pedido:', error);
    res.status(500).json({ mensaje: error.message || 'Error al procesar el pedido en el servidor' });
  } finally {
    connection.release();
  }
};

// 1.b Declinar un pedido interrumpido (cierre de pestaña / recarga a mitad del pago)
//
// IMPORTANTE al conectar la ruta: este endpoint se llama con
// navigator.sendBeacon desde el navegador, que NO puede mandar el header
// Authorization. Por eso NO debe pasar por el middleware de autenticación
// (verifyToken); su seguridad viene de que solo quien recibió el
// cancelToken al crear el pedido puede usarlo, y solo funciona mientras el
// pedido siga exactamente en 'pendiente'.
exports.declinarPedidoInterrumpido = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const { cancelToken, motivo } = req.body || {};

    if (!cancelToken) {
      return res.status(400).json({ mensaje: 'Falta cancelToken' });
    }

    await connection.beginTransaction();

    const [pedidos] = await connection.query(
      'SELECT id, estado, cancel_token FROM pedidos WHERE id = ? FOR UPDATE',
      [id]
    );

    if (pedidos.length === 0) {
      await connection.rollback();
      return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    }

    const pedido = pedidos[0];

    // Solo se puede declinar si el token coincide Y el pedido sigue
    // exactamente en 'pendiente' (si ya se pagó, ya se rechazó, etc., no
    // tocamos nada, para no pisar un estado más avanzado).
    if (!pedido.cancel_token || pedido.cancel_token !== cancelToken || pedido.estado !== 'pendiente') {
      await connection.rollback();
      return res.status(409).json({ mensaje: 'El pedido ya no se puede declinar' });
    }

    await connection.query(
      `UPDATE pedidos SET estado = 'cancelado', motivo_cancelacion = ? WHERE id = ?`,
      [motivo || 'El pago no se completó (ventana cerrada o conexión interrumpida).', id]
    );

    await reponerStock(connection, id);

    await connection.commit();
    res.status(200).json({ mensaje: `Pedido #${id} declinado`, estado: 'cancelado' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al declinar pedido interrumpido:', error);
    res.status(500).json({ mensaje: 'Error al declinar el pedido' });
  } finally {
    connection.release();
  }
};

// 2. Historial de compras del cliente autenticado
exports.obtenerMisPedidos = async (req, res) => {
  try {
    // Antes de listar, declinamos cualquier pedido que se haya quedado
    // atorado en 'pendiente' más tiempo del permitido, para que nunca se
    // muestre como si siguiera en curso.
    await expirarPedidosVencidos();

    const usuarioId = req.usuario.id;

    const [pedidos] = await pool.query(
      `
      SELECT 
        p.id, 
        p.total, 
        p.estado, 
        p.tipo_entrega, 
        p.direccion_envio, 
        p.creado_en,
        p.motivo_cancelacion,
        pg.metodo_pago
      FROM pedidos p
      LEFT JOIN pagos pg ON p.id = pg.pedido_id
      WHERE p.usuario_id = ?
      ORDER BY p.creado_en DESC
      `,
      [usuarioId]
    );

    if (pedidos.length === 0) {
      return res.json([]);
    }

    const idsPedidos = pedidos.map((p) => p.id);

    const [detalles] = await pool.query(
      `
      SELECT 
        dp.pedido_id,
        dp.cantidad,
        dp.precio_unitario,
        pr.nombre
      FROM detalle_pedidos dp
      LEFT JOIN productos pr ON dp.producto_id = pr.id
      WHERE dp.pedido_id IN (?)
      `,
      [idsPedidos]
    );

    const pedidosCompletos = pedidos.map((pedido) => ({
      ...pedido,
      items: detalles.filter((d) => d.pedido_id === pedido.id)
    }));

    res.json(pedidosCompletos);
  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    res.status(500).json({ mensaje: 'Error al consultar tus pedidos' });
  }
};

exports.obtenerPedidosCocina = async (req, res) => {
  try {
    // Mismo saneo antes de mostrarle la lista a cocina.
    await expirarPedidosVencidos();

    const [pedidos] = await pool.query(`
      SELECT 
        p.id, 
        p.usuario_id,
        u.nombre AS cliente_nombre,
        u.telefono AS cliente_telefono,
        p.total, 
        p.estado, 
        p.tipo_entrega, 
        p.direccion_envio, 
        p.creado_en
      FROM pedidos p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      ORDER BY p.creado_en DESC
    `);

    res.json(pedidos);
  } catch (error) {
    console.error('Error al obtener pedidos para cocina:', error);
    res.status(500).json({ mensaje: 'Error al consultar pedidos de la cocina' });
  }
};

exports.obtenerPedidosRepartidor = async (req, res) => {
  try {
    const [pedidos] = await pool.query(`
      SELECT 
        p.id, 
        p.usuario_id,
        u.nombre AS cliente_nombre,
        u.telefono AS cliente_telefono,
        p.total, 
        p.estado, 
        p.tipo_entrega, 
        p.direccion_envio, 
        p.creado_en
      FROM pedidos p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.tipo_entrega = 'domicilio'
        AND p.estado IN ('listo', 'en_envio')
      ORDER BY p.creado_en ASC
    `);

    res.json(pedidos);
  } catch (error) {
    console.error('Error al obtener pedidos para repartidor:', error);
    res.status(500).json({ mensaje: 'Error al consultar pedidos para entrega' });
  }
};

// 5. Actualizar estado del pedido
exports.actualizarEstadoPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevo_estado } = req.body;

    // Obtenemos los datos del usuario autenticado desde el token
    const usuarioId = req.usuario?.id;
    const rolUsuario = req.usuario?.rol;

    const estadosValidos = new Set([
      'pendiente',
      'recibido',
      'en_preparacion',
      'listo',
      'en_envio',
      'entregado',
      'cancelado'
    ]);

    if (!estadosValidos.has(nuevo_estado)) {
      return res.status(400).json({ mensaje: 'El estado ingresado no es válido' });
    }

    // Si el repartidor inicia la entrega (pasa a 'en_envio'), se enlaza su ID
    const asignaRepartidor = rolUsuario === 'repartidor' && nuevo_estado === 'en_envio';

    const sql = asignaRepartidor
      ? 'UPDATE pedidos SET estado = ?, repartidor_id = ? WHERE id = ?'
      : 'UPDATE pedidos SET estado = ? WHERE id = ?';
    const params = asignaRepartidor
      ? [nuevo_estado, usuarioId, id]
      : [nuevo_estado, id];

    const [resultado] = await pool.query(sql, params);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    }

    res.json({
      mensaje: `Pedido #${id} actualizado a ${nuevo_estado}`,
      nuevo_estado,
      repartidor_id: asignaRepartidor ? usuarioId : undefined
    });
  } catch (error) {
    console.error('Error al actualizar estado del pedido:', error);
    res.status(500).json({ mensaje: 'Error al actualizar el pedido' });
  }
};

// 6. Obtener producto por ID
exports.obtenerProductoPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        p.*,
        c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.id = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({ mensaje: 'Error al obtener producto' });
  }
};

// 7. Cancelar o rechazar pedido con reposición de inventario
exports.cancelarORechazarPedido = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const usuarioId = req.usuario.id;
    const esAdmin = req.usuario.rol === 'admin';

    await connection.beginTransaction();

    const [pedidos] = await connection.query(
      'SELECT id, usuario_id, estado FROM pedidos WHERE id = ? FOR UPDATE',
      [id]
    );

    if (pedidos.length === 0) {
      await connection.rollback();
      return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    }

    const pedido = pedidos[0];

    if (!esAdmin && pedido.usuario_id !== usuarioId) {
      await connection.rollback();
      return res.status(403).json({ mensaje: 'No tienes permiso para modificar este pedido' });
    }

    if (['cancelado', 'rechazado', 'entregado'].includes(pedido.estado)) {
      await connection.rollback();
      return res.status(400).json({
        mensaje: `No se puede cancelar un pedido que ya está en estado "${pedido.estado}".`
      });
    }

    const nuevoEstado = esAdmin ? 'rechazado' : 'cancelado';

    await connection.query(
      'UPDATE pedidos SET estado = ?, motivo_cancelacion = ? WHERE id = ?',
      [nuevoEstado, motivo || 'Sin motivo especificado', id]
    );

    await connection.query(
      'UPDATE pagos SET estado = "cancelado" WHERE pedido_id = ?',
      [id]
    );

    await reponerStock(connection, id);

    await connection.commit();

    res.json({
      mensaje: `Pedido #${id} marcado como ${nuevoEstado} exitosamente y stock reincorporado.`,
      estado: nuevoEstado
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error al cancelar pedido:', error);
    res.status(500).json({ mensaje: error.message || 'Error en el servidor al cancelar el pedido' });
  } finally {
    connection.release();
  }
};

// 8. Disponibilidad de horarios para una fecha dada (usado por el checkout
// para pintar el selector de fecha/hora y deshabilitar lo que ya está lleno).
// GET /pedidos/disponibilidad?fecha=YYYY-MM-DD
exports.obtenerDisponibilidad = async (req, res) => {
  try {
    const { fecha } = req.query;

    if (!fecha) {
      return res.status(400).json({ mensaje: 'Falta el parámetro fecha (YYYY-MM-DD)' });
    }

    const fechaObj = new Date(`${fecha}T00:00:00`);
    const esDomingo = fechaObj.getDay() === 0;
    const cumpleAnticipacion = fecha >= fechaMinima();

    const resultado = { fecha, esDomingo, cumpleAnticipacion };

    for (const tipo of TIPOS_ENTREGA_VALIDOS) {
      const [conteoDia] = await pool.query(
        `SELECT COUNT(*) AS total FROM pedidos
         WHERE tipo_entrega = ? AND DATE(fecha_entrega) = ? AND estado IN ${ESTADOS_QUE_OCUPAN_CUPO}`,
        [tipo, fecha]
      );

      const [porHora] = await pool.query(
        `SELECT HOUR(fecha_entrega) AS hora, COUNT(*) AS total FROM pedidos
         WHERE tipo_entrega = ? AND DATE(fecha_entrega) = ? AND estado IN ${ESTADOS_QUE_OCUPAN_CUPO}
         GROUP BY HOUR(fecha_entrega)`,
        [tipo, fecha]
      );

      const ocupadosPorHora = {};
      porHora.forEach((fila) => {
        ocupadosPorHora[fila.hora] = fila.total;
      });

      const totalDia = conteoDia[0].total;
      const lleno = totalDia >= CUPO_DIARIO_POR_TIPO || esDomingo || !cumpleAnticipacion;

      resultado[tipo] = {
        cupoDiario: CUPO_DIARIO_POR_TIPO,
        ocupados: totalDia,
        lleno,
        horas: horasDelDia().map((h) => {
          const ocupadosHora = ocupadosPorHora[h] || 0;
          return {
            hora: `${String(h).padStart(2, '0')}:00`,
            ocupados: ocupadosHora,
            cupo: CUPO_POR_HORA,
            disponible: !lleno && ocupadosHora < CUPO_POR_HORA
          };
        })
      };
    }

    res.json(resultado);
  } catch (error) {
    console.error('Error al consultar disponibilidad:', error);
    res.status(500).json({ mensaje: 'Error al consultar la disponibilidad' });
  }
};

// 9. Próxima fecha con cupo libre para un tipo de entrega dado.
// GET /pedidos/proxima-fecha-disponible?tipo_entrega=domicilio&desde=YYYY-MM-DD
exports.obtenerProximaFechaDisponible = async (req, res) => {
  try {
    const { tipo_entrega, desde } = req.query;

    if (!TIPOS_ENTREGA_VALIDOS.has(tipo_entrega)) {
      return res.status(400).json({ mensaje: 'tipo_entrega debe ser "domicilio" o "sucursal"' });
    }

    const desdeStr = desde && desde >= fechaMinima() ? desde : fechaMinima();
    const proxima = await buscarProximaFechaDisponible(tipo_entrega, desdeStr);

    if (!proxima) {
      return res.status(404).json({ mensaje: 'No se encontró una fecha disponible próximamente' });
    }

    res.json({ fecha: proxima });
  } catch (error) {
    console.error('Error al buscar próxima fecha disponible:', error);
    res.status(500).json({ mensaje: 'Error al buscar la próxima fecha disponible' });
  }
};

// Exportado por si quieres además correrlo como un job periódico real desde
// tu archivo de arranque del servidor, por ejemplo:
//   const { expirarPedidosVencidos } = require('./modules/pedidos/pedidos.controller');
//   setInterval(expirarPedidosVencidos, 2 * 60 * 1000); // cada 2 minutos
exports.expirarPedidosVencidos = expirarPedidosVencidos;