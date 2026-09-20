
// backend/src/modules/pedidos/pedidos.controller.js
const pool = require('../../config/db');

// 1. Crear nuevo pedido (Checkout seguro con Transacción)
exports.crearPedido = async (req, res) => {
  // Obtenemos una conexión dedicada del pool para manejar la transacción
  const connection = await pool.getConnection();

  try {
    const { tipo_entrega, direccion_envio, metodo_pago, total, items } = req.body;
    const usuarioId = req.usuario ? req.usuario.id : 1;

    // Iniciar transacción
    await connection.beginTransaction();

    // 1. Guardar cabecera del pedido
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

    // 2. Registrar el pago inicial
    const queryPago = `
      INSERT INTO pagos (pedido_id, metodo_pago, monto, estado)
      VALUES (?, ?, ?, 'pendiente');
    `;
    await connection.query(queryPago, [
      pedidoId,
      metodo_pago || 'tarjeta',
      total || 0
    ]);

    // 3. Registrar detalle de productos en una sola consulta (Batch Insert)
    if (items && Array.isArray(items) && items.length > 0) {
      const valoresDetalle = items.map(item => {
        // Detecta el ID sin importar cómo venga del frontend
        const productoId = item.producto_id || item.productoId || item.id || item.id_producto;
        
        // Detecta el precio sin importar cómo venga del frontend
        const precioUnitario = item.precio_unitario || item.precioUnitario || item.precio || item.price || 0;
        
        // Detecta la cantidad
        const cantidad = item.cantidad || item.quantity || 1;

        return [
          pedidoId,
          productoId,
          cantidad,
          precioUnitario
        ];
      });

      const queryDetalle = `
        INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario)
        VALUES ?
      `;

      await connection.query(queryDetalle, [valoresDetalle]);
    }

    // Confirmar todos los cambios atómicos
    await connection.commit();

    res.status(201).json({
      mensaje: 'Pedido creado exitosamente con estado pendiente',
      pedidoId
    });
  } catch (error) {
    // Si algo falla, revertimos cualquier cambio
    await connection.rollback();
    console.error('Error al crear pedido:', error);
    res.status(500).json({ mensaje: 'Error al procesar el pedido en el servidor' });
  } finally {
    // Liberar la conexión de vuelta al pool siempre
    connection.release();
  }
};

// 2. Obtener todos los pedidos (Para cocina / admin con datos del cliente)
exports.obtenerPedidos = async (req, res) => {
  try {
    // Opcional: JOIN con usuarios si necesitas nombre/correo en el panel administrativo
    const [pedidos] = await pool.query(`
      SELECT 
        p.id, 
        p.usuario_id, 
        p.total, 
        p.estado, 
        p.tipo_entrega, 
        p.direccion_envio, 
        p.creado_en
      FROM pedidos p
      ORDER BY p.creado_en DESC
    `);

    res.json(pedidos);
  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    res.status(500).json({ mensaje: 'Error al consultar los pedidos' });
  }
};

// 3. Actualizar estado del pedido (Cocina / Admin)
exports.actualizarEstadoPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevo_estado } = req.body;

    const estadosValidos = [
      'pendiente',
      'recibido',
      'en_envio',
      'listo',
      'entregado',
      'cancelado'
    ];

    if (!estadosValidos.includes(nuevo_estado)) {
      return res.status(400).json({ mensaje: 'Estado no válido' });
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
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ mensaje: 'Error al actualizar pedido' });
  }
};