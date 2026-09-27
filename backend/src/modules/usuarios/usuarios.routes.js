// backend/src/modules/usuarios/usuarios.routes.js
const express = require('express');
const router = express.Router();
const usuariosController = require('./usuarios.controller');
const { autenticarToken, requerirRol} = require('../../middlewares/auth');

// Rutas públicas
router.post('/registro', usuariosController.registrarUsuario);
router.post('/login', usuariosController.loginUsuario);

// Ruta protegida (requiere token JWT)
router.get('/perfil', autenticarToken, usuariosController.obtenerPerfil);
router.get('/empleados', autenticarToken, requerirRol('admin'), usuariosController.obtenerEmpleados);
router.post('/empleados', autenticarToken, requerirRol('admin'), usuariosController.crearEmpleado);
router.put('/empleados/:id', autenticarToken, requerirRol('admin'), usuariosController.actualizarEmpleado);
router.delete('/empleados/:id', autenticarToken, requerirRol('admin'), usuariosController.eliminarEmpleado);

module.exports = router;