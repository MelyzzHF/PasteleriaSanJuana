// backend/src/modules/catalogo/catalogo.controller.js
const db = require('../../config/db');


// Crear producto
const crearProducto = async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, imagen_url, imagen_url_2, imagen_url_3, porciones, detalles, categoria_id } = req.body;
    const [result] = await db.query(
      `INSERT INTO productos (nombre, descripcion, precio, stock, imagen_url, imagen_url_2, imagen_url_3, porciones, detalles, categoria_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, descripcion, precio || 0, stock || 0, imagen_url, imagen_url_2, imagen_url_3, porciones || '16 personas', detalles, categoria_id || 1]
    );
    res.status(201).json({ mensaje: 'Producto creado exitosamente', id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al crear el producto' });
  }
};

// Eliminar producto
const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM productos WHERE id = ?', [id]);
    res.json({ mensaje: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al eliminar el producto' });
  }
};

const actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, precio, stock, descripcion, porciones, detalles, imagen_url, imagen_url_2, imagen_url_3 } = req.body;

    await db.query(
      `
      UPDATE productos 
      SET 
        nombre = ?,
        precio = ?,
        stock = ?,
        descripcion = ?,
        porciones = ?,
        detalles = ?,
        imagen_url = ?,
        imagen_url_2 = ?,
        imagen_url_3 = ?
      WHERE id = ?
      `,
      [nombre, precio, stock, descripcion, porciones, detalles, imagen_url, imagen_url_2, imagen_url_3, id]
    );

    res.json({ mensaje: 'Producto actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ mensaje: 'Error al actualizar el producto' });
  }
};

// Obtener todos los productos activos
const obtenerProductos = async (req, res) => {
  try {
    // Si usas db.query (PostgreSQL):
    const resultado = await db.query('SELECT * FROM productos WHERE activo = true ORDER BY id ASC');
    const productos = resultado.rows || resultado[0]; 
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
    const resultado = await db.query('SELECT * FROM productos WHERE id = ?', [id]);
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
  obtenerCategorias,
  eliminarProducto,
  crearProducto,
  actualizarProducto
};