// backend/src/modules/pedidos/pedidos.routes.js
const express = require('express');
const router = express.Router();
const pedidosController = require('./pedidos.controller');
const { autenticarToken, requerirRol } = require('../../middlewares/auth');

router.post('/', autenticarToken, pedidosController.crearPedido);
router.get('/mis-pedidos', autenticarToken, pedidosController.obtenerMisPedidos);
router.get('/repartidor', autenticarToken, requerirRol('admin', 'repartidor'), pedidosController.obtenerPedidosRepartidor);
router.get('/', autenticarToken, requerirRol('admin', 'cocina'), pedidosController.obtenerPedidosCocina);

router.patch('/:id/estado', autenticarToken, requerirRol('admin', 'cocina', 'repartidor'), pedidosController.actualizarEstadoPedido);
router.put('/:id/cancelar', autenticarToken, pedidosController.cancelarORechazarPedido);

module.exports = router;