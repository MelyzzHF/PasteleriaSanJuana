// backend/src/modules/pedidos/pedidos.controller.js
const pool = require('../../config/db');

// 1. Crear nuevo pedido (Checkout seguro con Transacción)
exports.crearPedido = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { tipo_entrega, direccion_envio, fecha_entrega, total, items } = req.body;
    const usuarioId = req.usuario.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ mensaje: 'No hay productos en el pedido' });
    }

    await connection.beginTransaction();

    // 1. Validación de existencias antes de procesar
    for (const item of items) {
      const productoId = item.producto_id || item.productoId || item.id || item.id_producto;
      const cantidad = Number(item.cantidad || item.quantity || 1);

      const [filas] = await connection.query(
        'SELECT nombre, stock FROM productos WHERE id = ? FOR UPDATE',
        [productoId]
      );

      if (filas.length === 0) {
        await connection.rollback();
        return res.status(404).json({ mensaje: `El producto con ID ${productoId} no existe.` });
      }

      const productoBD = filas[0];
      if (productoBD.stock < cantidad) {
        await connection.rollback();
        return res.status(400).json({
          mensaje: `Stock insuficiente para "${productoBD.nombre}". Disponibles: ${productoBD.stock}, solicitados: ${cantidad}.`
        });
      }
    }

    // 2. Insertar cabecera del pedido (incluyendo fecha_entrega)
    const queryPedido = `
      INSERT INTO pedidos (usuario_id, total, estado, direccion_envio, tipo_entrega, fecha_entrega)
      VALUES (?, ?, 'pendiente', ?, ?, ?);
    `;

    const [pedidoResult] = await connection.query(queryPedido, [
      usuarioId,
      total || 0,
      direccion_envio || null,
      tipo_entrega || 'domicilio',
      fecha_entrega || null
    ]);

    const pedidoId = pedidoResult.insertId;

    // 3. Registrar detalle de productos y descontar stock
    const valoresDetalle = [];

    for (const item of items) {
      const productoId = item.producto_id || item.productoId || item.id || item.id_producto;
      const precioUnitario = Number(item.precio_unitario || item.precioUnitario || item.precio || item.price || 0);
      const cantidad = Number(item.cantidad || item.quantity || 1);

      valoresDetalle.push([pedidoId, productoId, cantidad, precioUnitario]);

      await connection.query(
        'UPDATE productos SET stock = stock - ? WHERE id = ?',
        [cantidad, productoId]
      );
    }

    const queryDetalle = `
      INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario)
      VALUES ?
    `;
    await connection.query(queryDetalle, [valoresDetalle]);

    await connection.commit();

    res.status(201).json({
      mensaje: '¡Pedido creado exitosamente!',
      pedidoId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error al crear pedido:', error);
    res.status(500).json({ mensaje: error.message || 'Error al procesar el pedido en el servidor' });
  } finally {
    connection.release();
  }
};

// 2. Historial de compras del cliente autenticado
exports.obtenerMisPedidos = async (req, res) => {
  try {
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

    const estadosValidos = [
      'pendiente',
      'recibido',
      'en_preparacion',
      'listo',
      'en_envio',
      'entregado',
      'cancelado'
    ];

    if (!estadosValidos.includes(nuevo_estado)) {
      return res.status(400).json({ mensaje: 'El estado ingresado no es válido' });
    }

    let sql = 'UPDATE pedidos SET estado = ? WHERE id = ?';
    let params = [nuevo_estado, id];

    // Si el usuario con rol repartidor inicia la entrega (o pasa a 'en_envio'), se enlaza su ID
    if (rolUsuario === 'repartidor' && nuevo_estado === 'en_envio') {
      sql = 'UPDATE pedidos SET estado = ?, repartidor_id = ? WHERE id = ?';
      params = [nuevo_estado, usuarioId, id];
    }

    const [resultado] = await pool.query(sql, params);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    }

    res.json({
      mensaje: `Pedido #${id} actualizado a ${nuevo_estado}`,
      nuevo_estado,
      repartidor_id: rolUsuario === 'repartidor' && nuevo_estado === 'en_envio' ? usuarioId : undefined
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

    // Reponer stock
    const [detalles] = await connection.query(
      'SELECT producto_id, cantidad FROM detalle_pedidos WHERE pedido_id = ?',
      [id]
    );

    for (const item of detalles) {
      await connection.query(
        'UPDATE productos SET stock = stock + ? WHERE id = ?',
        [item.cantidad, item.producto_id]
      );
    }

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