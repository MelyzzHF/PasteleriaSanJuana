const pool = require('../../config/db');
const crypto = require('node:crypto');

function simularPago(metodo_pago, datos_tarjeta) {
  switch (metodo_pago) {
    case 'tarjeta': {
      // Simulación: si termina en 0000 se rechaza; de lo contrario se aprueba
      if (datos_tarjeta?.numero?.endsWith('0000')) {
        return { estado: 'cancelado', referencia: null };
      }
      const randomNum = crypto.randomInt(0, 1000);
      return {
        estado: 'completado',
        referencia: `TX-CARD-${Date.now()}-${randomNum}`
      };
    }
    case 'transferencia':
      return {
        estado: 'pendiente',
        referencia: `SPEI-${Date.now().toString().slice(-6)}`
      };
    case 'efectivo':
      return { estado: 'pendiente', referencia: 'EFECTIVO-CONTRAENTREGA' };
    default:
      return { estado: 'pendiente', referencia: null };
  }
}

const procesarPagoSimulado = async (req, res) => {
  const { pedido_id, metodo_pago, monto, datos_tarjeta } = req.body;

  try {
    const { estado: nuevoEstado, referencia: referenciaTransaccion } =
      simularPago(metodo_pago, datos_tarjeta);

    // 1. Insertar el registro en la tabla pagos
    const [resultado] = await pool.query(
      `INSERT INTO pagos (pedido_id, metodo_pago, monto, estado, referencia_transaccion, creado_en)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [pedido_id, metodo_pago, monto, nuevoEstado, referenciaTransaccion]
    );

    // 2. Si el pago fue declinado, cancelar el pedido
    if (nuevoEstado === 'cancelado') {
      await pool.query(
        `UPDATE pedidos SET estado = 'cancelado', motivo_cancelacion = 'Pago con tarjeta declinado (Simulación)' WHERE id = ?`,
        [pedido_id]
      );

      return res.status(400).json({
        ok: false,
        mensaje: 'Pago declinado. Tarjeta simulada rechazada.'
      });
    }

    // 3. Pago exitoso o pendiente (efectivo/transferencia): el pedido entra a cocina como 'recibido'
    await pool.query(
      `UPDATE pedidos SET estado = 'recibido' WHERE id = ?`,
      [pedido_id]
    );

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