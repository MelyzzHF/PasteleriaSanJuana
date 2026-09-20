// backend/src/modules/catalogo/catalogo.routes.js
const express = require('express');
const router = express.Router();
const catalogoController = require('./catalogo.controller');

// Rutas públicas de lectura
router.get('/productos', catalogoController.obtenerProductos);
router.get('/productos/:id', catalogoController.obtenerProductoPorId);
router.get('/categorias', catalogoController.obtenerCategorias);

module.exports = router;