const pool = require('../../config/db');

const procesarPagoSimulado = async (req, res) => { 
  const { pedido_id, metodo_pago, monto, datos_tarjeta } = req.body;

  try {
    let nuevoEstado = 'pendiente';
    let referenciaTransaccion = null;

    if (metodo_pago === 'tarjeta') {
      // Simulación: Si termina en 0000, simula rechazo; de lo contrario, aprueba
      if (datos_tarjeta?.numero?.endsWith('0000')) {
        nuevoEstado = 'cancelado';
      } else {
        nuevoEstado = 'completado'; // o 'pagado' según los ENUM que manejes
        referenciaTransaccion = `TX-CARD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }
    } else if (metodo_pago === 'transferencia') {
      nuevoEstado = 'pendiente';
      referenciaTransaccion = `SPEI-${Date.now().toString().slice(-6)}`;
    } else if (metodo_pago === 'efectivo') {
      nuevoEstado = 'pendiente';
      referenciaTransaccion = `EFECTIVO-CONTRAENTREGA`;
    }

    // 1. Insertar el registro con las columnas exactas de tu tabla
    const [resultado] = await pool.query(
      `INSERT INTO pagos (pedido_id, metodo_pago, monto, estado, referencia_transaccion, creado_en)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [pedido_id, metodo_pago, monto, nuevoEstado, referenciaTransaccion]
    );

    // 2. Si el pago fue completado, puedes actualizar el estado general del pedido
    if (nuevoEstado === 'completado') {
      await pool.query(
        `UPDATE pedidos SET estado = 'en_preparacion' WHERE id = ?`,
        [pedido_id]
      );
    } else if (nuevoEstado === 'cancelado') {
      await pool.query(
        `UPDATE pedidos SET estado = 'cancelado' WHERE id = ?`,
        [pedido_id]
      );
    }

    if (nuevoEstado === 'cancelado') {
      return res.status(400).json({
        ok: false,
        mensaje: 'Pago declinado. Tarjeta simulada rechazada.'
      });
    }

    return res.status(201).json({
      ok: true,
      pago_id: resultado.insertId,
      referencia_transaccion: referenciaTransaccion,
      estado: nuevoEstado,
      mensaje: 'Pago registrado exitosamente'
    });
  } catch (error) {
    console.error('Error al registrar pago:', error);
    return res.status(500).json({ error: 'Error al procesar el pago' });
  }
};

const obtenerPagoPorPedido = async (req, res) => {
  const { pedidoId } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM pagos WHERE pedido_id = ? ORDER BY id DESC LIMIT 1',
      [pedidoId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró registro de pago para este pedido' });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener pago:', error);
    return res.status(500).json({ error: 'Error al consultar el pago' });
  }
};

module.exports = {
  procesarPagoSimulado,
  obtenerPagoPorPedido
};