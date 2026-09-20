// backend/src/modules/usuarios/usuarios.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');

// Registro de usuario
const registrarUsuario = async (req, res) => {
  const { nombre, apellidos, email, password, telefono } = req.body;

  // Validación de campos requeridos
  if (!nombre || !apellidos || !email || !password || !telefono) {
    return res.status(400).json({ error: 'Nombre, apellidos, teléfono, correo y contraseña son obligatorios' });
  }

  try {
    // 1. Verificar existencia del correo
    const [existe] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email.trim().toLowerCase()]);
    if (existe && existe.length > 0) {
      return res.status(409).json({ error: 'Este correo electrónico ya se encuentra registrado' });
    }

    // 2. Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Guardar nombre y apellidos juntos en la tabla
    const nombreCompleto = `${nombre.trim()} ${apellidos.trim()}`;

    const [resultado] = await db.query(
      `INSERT INTO usuarios (nombre, email, password, telefono, rol)
       VALUES (?, ?, ?, ?, 'cliente')`,
      [nombreCompleto, email.trim().toLowerCase(), passwordHash, telefono.trim()]
    );

    const usuarioCreado = {
      id: resultado.insertId,
      nombre: nombreCompleto,
      email: email.trim().toLowerCase(),
      telefono: telefono.trim(),
      rol: 'cliente'
    };

    // 4. Token de sesión
    const token = jwt.sign(
      { id: usuarioCreado.id, email: usuarioCreado.email, rol: usuarioCreado.rol },
      process.env.JWT_SECRET || 'clave_secreta_default',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({
      mensaje: 'Usuario registrado con éxito',
      usuario: usuarioCreado,
      token
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error interno al registrar el usuario' });
  }
};

// Inicio de sesión
const loginUsuario = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña requeridos' });
  }

  try {
    const [filas] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email.trim().toLowerCase()]);

    if (!filas || filas.length === 0) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const usuario = filas[0];

    const esValida = await bcrypt.compare(password, usuario.password);
    if (!esValida) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET || 'clave_secreta_default',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      mensaje: 'Sesión iniciada',
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono,
        rol: usuario.rol
      },
      token
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno al iniciar sesión' });
  }
};

// Consultar perfil
const obtenerPerfil = async (req, res) => {
  try {
    const [filas] = await db.query(
      'SELECT id, nombre, email, telefono, rol, creado_en FROM usuarios WHERE id = ?',
      [req.usuario.id]
    );

    if (!filas || filas.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(filas[0]);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error al consultar perfil' });
  }
};

module.exports = {
  registrarUsuario,
  loginUsuario,
  obtenerPerfil
};