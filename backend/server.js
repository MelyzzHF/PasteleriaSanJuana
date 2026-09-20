// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importación de rutas de los módulos
const usuariosRoutes = require('./src/modules/usuarios/usuarios.routes');
const catalogoRoutes = require('./src/modules/catalogo/catalogo.routes');
const pedidosRoutes = require('./src/modules/pedidos/pedidos.routes');
//const pagosRoutes = require('./src/modules/pagos/pagos.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares globales
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Verificación de estado de la API
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API Pastelería operando correctamente' });
});

// Enrutamiento modular
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/catalogo', catalogoRoutes);
app.use('/api/pedidos', pedidosRoutes);
//app.use('/api/pagos', pagosRoutes);

// Manejador de rutas no encontradas (404)
app.use((req, res, next) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error('Error no controlado en el servidor:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
  });
});

// Inicio del servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🍰 Modo: ${process.env.NODE_ENV || 'development'}`);
});