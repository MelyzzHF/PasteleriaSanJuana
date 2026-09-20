// backend/src/modules/catalogo/catalogo.controller.js
const db = require('../../config/db');

// Obtener todos los productos activos
const obtenerProductos = async (req, res) => {
  try {
    // Si usas db.query (PostgreSQL):
    const resultado = await db.query('SELECT * FROM productos WHERE activo = true ORDER BY id ASC');
    const productos = resultado.rows || resultado[0]; // Compatible con pg y mysql2
    res.json(productos);
  } catch (error) {
    console.error('Error al obtener catálogo:', error);
    res.status(500).json({ error: 'Error al consultar productos' });
  }
};

// Obtener un solo producto por ID
const obtenerProductoPorId = async (req, res) => {
  const { id } = req.params;
  try {
    // Para PostgreSQL usa $1; si usas MySQL cambia $1 por ?
    const resultado = await db.query('SELECT * FROM productos WHERE id = $1', [id]);
    const filas = resultado.rows || resultado[0];

    if (filas.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(filas[0]);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({ error: 'Error al consultar el producto' });
  }
};

// Obtener categorías
const obtenerCategorias = async (req, res) => {
  try {
    const resultado = await db.query('SELECT * FROM categorias ORDER BY id ASC');
    const categorias = resultado.rows || resultado[0];
    res.json(categorias);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ error: 'Error al consultar categorías' });
  }
};

module.exports = {
  obtenerProductos,
  obtenerProductoPorId,
  obtenerCategorias
};