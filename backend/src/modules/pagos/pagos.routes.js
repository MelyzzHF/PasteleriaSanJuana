const express = require('express');
const router = express.Router();

const { procesarPagoSimulado, obtenerPagoPorPedido } = require('./pagos.controller');
const { autenticarToken } = require('../../middlewares/auth');

// Procesa o simula la transacción
router.post('/procesar', autenticarToken, procesarPagoSimulado);

// Consulta los datos del pago por ID de pedido
router.get('/pedido/:pedidoId', autenticarToken, obtenerPagoPorPedido);

module.exports = router;