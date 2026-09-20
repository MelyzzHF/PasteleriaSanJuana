// backend/src/modules/usuarios/usuarios.routes.js
const express = require('express');
const router = express.Router();
const usuariosController = require('./usuarios.controller');
const { autenticarToken } = require('../../middlewares/auth');

// Rutas públicas
router.post('/registro', usuariosController.registrarUsuario);
router.post('/login', usuariosController.loginUsuario);

// Ruta protegida (requiere token JWT)
router.get('/perfil', autenticarToken, usuariosController.obtenerPerfil);

module.exports = router;