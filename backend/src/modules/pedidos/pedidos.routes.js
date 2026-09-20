// backend/src/modules/pedidos/pedidos.routes.js
const express = require('express');
const router = express.Router();
const pedidosController = require('./pedidos.controller');

router.post('/', pedidosController.crearPedido);
router.get('/', pedidosController.obtenerPedidos);
router.patch('/:id/estado', pedidosController.actualizarEstadoPedido);

module.exports = router;