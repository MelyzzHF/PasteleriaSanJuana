// backend/src/modules/pedidos/pedidos.controller.js
const pool = require('../../config/db');

// 1. Crear nuevo pedido (Checkout seguro con Transacción)
exports.crearPedido = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { tipo_entrega, direccion_envio, metodo_pago, total, items } = req.body;
    const usuarioId = req.usuario.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ mensaje: 'No hay productos en el pedido' });
    }

    await connection.beginTransaction();

    // 1. Validar disponibilidad de stock antes de registrar nada
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

    // 2. Insertar cabecera del pedido
    const queryPedido = `
      INSERT INTO pedidos (usuario_id, total, estado, direccion_envio, tipo_entrega)
      VALUES (?, ?, 'pendiente', ?, ?);
    `;

    const [pedidoResult] = await connection.query(queryPedido, [
      usuarioId,
      total || 0,
      direccion_envio || null,
      tipo_entrega || 'domicilio'
    ]);

    const pedidoId = pedidoResult.insertId;

    /* 3. Registrar el pago inicial asociado
    const queryPago = `
      INSERT INTO pagos (pedido_id, metodo_pago, monto, estado)
      VALUES (?, ?, ?, 'pendiente');
    `;
    await connection.query(queryPago, [
      pedidoId,
      metodo_pago || 'tarjeta',
      total || 0
    ]);*/

    // 4. Registrar detalle de productos y restar existencias
    const valoresDetalle = [];

    for (const item of items) {
      const productoId = item.producto_id || item.productoId || item.id || item.id_producto;
      const precioUnitario = Number(item.precio_unitario || item.precioUnitario || item.precio || item.price || 0);
      const cantidad = Number(item.cantidad || item.quantity || 1);

      valoresDetalle.push([pedidoId, productoId, cantidad, precioUnitario]);

      // 👉 Descontar del stock en la BD
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

exports.obtenerMisPedidos = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    // Paso 1: Obtener pedidos asegurando solo una fila por pedido
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
      GROUP BY p.id
      ORDER BY p.creado_en DESC
      `,
      [usuarioId]
    );

    if (pedidos.length === 0) {
      return res.json([]);
    }

    // Paso 2: Extraer IDs únicos de los pedidos
    const idsPedidos = pedidos.map((p) => p.id);

    // Paso 3: Traer los productos asociados
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

    // Paso 4: Emparejar productos a cada pedido
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

// 3. Obtener todos los pedidos (Exclusivo para Cocina / Admin)
exports.obtenerPedidosCocina = async (req, res) => {
  try {
    // Hace JOIN con la tabla de usuarios para mostrar el nombre y teléfono del cliente
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
      ORDER BY p.creado_en ASC
    `);

    res.json(pedidos);
  } catch (error) {
    console.error('Error al obtener pedidos para cocina:', error);
    res.status(500).json({ mensaje: 'Error al consultar pedidos de la cocina' });
  }
};

// 2. Obtener historial del cliente autenticado (Forma sencilla y directa)
exports.obtenerMisPedidos = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    // Paso 1: Obtener pedidos y su método de pago
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

    // Si el usuario aún no tiene ningún pedido, regresamos arreglo vacío
    if (pedidos.length === 0) {
      return res.json([]);
    }

    // Paso 2: Extraer todos los IDs de los pedidos encontrados
    const idsPedidos = pedidos.map(p => p.id);

    // Paso 3: Traer los productos asociados a esos pedidos
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

    // Paso 4: Asociar los productos a cada pedido correspondiente
    const pedidosCompletos = pedidos.map(pedido => ({
      ...pedido,
      items: detalles.filter(d => d.pedido_id === pedido.id)
    }));

    res.json(pedidosCompletos);
  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    res.status(500).json({ mensaje: 'Error al consultar tus pedidos' });
  }
};

// 4. Actualizar estado del pedido (Exclusivo para Cocina / Admin)
exports.actualizarEstadoPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevo_estado } = req.body;

    const estadosValidos = [
      'pendiente',
      'recibido',
      'listo',
      'en_envio',
      'entregado',
      'cancelado'
    ];

    if (!estadosValidos.includes(nuevo_estado)) {
      return res.status(400).json({ mensaje: 'El estado ingresado no es válido' });
    }

    const [resultado] = await pool.query(
      'UPDATE pedidos SET estado = ? WHERE id = ?',
      [nuevo_estado, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    }

    res.json({
      mensaje: `Pedido #${id} actualizado a ${nuevo_estado}`,
      nuevo_estado
    });
  } catch (error) {
    console.error('Error al actualizar estado del pedido:', error);
    res.status(500).json({ mensaje: 'Error al actualizar el pedido' });
  }
};

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

exports.cancelarORechazarPedido = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params; // ID del pedido
    const { motivo } = req.body; // Motivo opcional (ej: 'Cocina sin insumos', 'Cliente se equivocó')
    const usuarioId = req.usuario.id;
    const esAdmin = req.usuario.rol === 'admin';

    await connection.beginTransaction();

    // 1. Obtener el pedido y bloquearlo para la transacción
    const [pedidos] = await connection.query(
      'SELECT id, usuario_id, estado FROM pedidos WHERE id = ? FOR UPDATE',
      [id]
    );

    if (pedidos.length === 0) {
      await connection.rollback();
      return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    }

    const pedido = pedidos[0];

    // 2. Validar permisos: solo el dueño del pedido o un admin/cocina pueden cancelarlo
    if (!esAdmin && pedido.usuario_id !== usuarioId) {
      await connection.rollback();
      return res.status(403).json({ mensaje: 'No tienes permiso para modificar este pedido' });
    }

    // 3. Validar estado: solo se puede cancelar si sigue 'pendiente' o 'en_preparacion'
    if (['cancelado', 'rechazado', 'entregado'].includes(pedido.estado)) {
      await connection.rollback();
      return res.status(400).json({ 
        mensaje: `No se puede cancelar un pedido que ya está en estado "${pedido.estado}".` 
      });
    }

    // Definir estado final: si lo hace el admin/cocina es 'rechazado', si es el usuario es 'cancelado'
    const nuevoEstado = esAdmin ? 'rechazado' : 'cancelado';

    // 4. Actualizar el estado del pedido
    await connection.query(
      'UPDATE pedidos SET estado = ?, motivo_cancelacion = ? WHERE id = ?',
      [nuevoEstado, motivo || 'Sin motivo especificado', id]
    );

    // Si manejas tabla de pagos, actualiza su estado también
    await connection.query(
      'UPDATE pagos SET estado = "cancelado" WHERE pedido_id = ?',
      [id]
    );

    // 5. OBTENER LOS PRODUCTOS DEL PEDIDO Y DEVOLVER EL STOCK
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