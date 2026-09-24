// backend/src/modules/usuarios/usuarios.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');

// Registro de usuario
const registrarUsuario = async (req, res) => {
  const { nombre, apellidos, email, password, telefono, rol } = req.body;

  if (!nombre || !apellidos || !email || !password || !telefono) {
    return res.status(400).json({ error: 'Nombre, apellidos, teléfono, correo y contraseña son obligatorios' });
  }

  try {
    const [existe] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email.trim().toLowerCase()]);
    if (existe && existe.length > 0) {
      return res.status(409).json({ error: 'Este correo electrónico ya se encuentra registrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const nombreCompleto = `${nombre.trim()} ${apellidos.trim()}`;

    const rolesValidos = ['cliente', 'admin', 'cocina', 'repartidor'];
    const rolAsignado = rolesValidos.includes(rol) ? rol : 'cliente';

    const [resultado] = await db.query(
      `INSERT INTO usuarios (nombre, email, password, telefono, rol)
       VALUES (?, ?, ?, ?, ?)`,
      [nombreCompleto, email.trim().toLowerCase(), passwordHash, telefono.trim(), rolAsignado]
    );

    const usuarioCreado = {
      id: resultado.insertId,
      nombre: nombreCompleto,
      email: email.trim().toLowerCase(),
      telefono: telefono.trim(),
      rol: rolAsignado
    };

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

const crearEmpleado = async (req, res) => {
  try {
    const { nombre, email, password, telefono, rol } = req.body;

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ mensaje: 'Todos los campos obligatorios deben completarse' });
    }

    const rolesPermitidos = ['cocina', 'repartidor', 'admin'];
    if (!rolesPermitidos.includes(rol)) {
      return res.status(400).json({ mensaje: 'El rol especificado no es válido' });
    }

    const [usuarioExistente] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (usuarioExistente.length > 0) {
      return res.status(400).json({ mensaje: 'Ya existe un usuario con ese correo electrónico' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHasheada = await bcrypt.hash(password, salt);

    const query = `
      INSERT INTO usuarios (nombre, email, password, telefono, rol, creado_en)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    const [resultado] = await db.query(query, [nombre, email, passwordHasheada, telefono || null, rol]);

    return res.status(201).json({
      mensaje: 'Empleado registrado exitosamente',
      empleado: {
        id: resultado.insertId,
        nombre,
        email,
        telefono,
        rol
      }
    });
  } catch (error) {
    console.error('Error al registrar empleado:', error);
    return res.status(500).json({ mensaje: 'Error interno en el servidor' });
  }
};
const obtenerEmpleados = async (req, res) => {
  try {
    const query = `
      SELECT id, nombre, email, telefono, rol, creado_en 
      FROM usuarios 
      WHERE rol IN ('cocina', 'repartidor', 'admin')
      ORDER BY id DESC
    `;
    const [empleados] = await db.query(query);
    return res.json(empleados);
  } catch (error) {
    console.error('Error al obtener empleados:', error);
    return res.status(500).json({ mensaje: 'Error al obtener la lista de empleados' });
  }
};

// Editar datos o rol de un empleado
const actualizarEmpleado = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, telefono, rol } = req.body;

    const rolesPermitidos = ['cocina', 'repartidor', 'admin'];
    if (rol && !rolesPermitidos.includes(rol)) {
      return res.status(400).json({ mensaje: 'Rol inválido' });
    }

    const query = `
      UPDATE usuarios 
      SET nombre = ?, email = ?, telefono = ?, rol = ?
      WHERE id = ?
    `;
    await db.query(query, [nombre, email, telefono || null, rol, id]);

    return res.json({ mensaje: 'Empleado actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar empleado:', error);
    return res.status(500).json({ mensaje: 'Error al actualizar los datos del empleado' });
  }
};

// Eliminar un empleado
const eliminarEmpleado = async (req, res) => {
  try {
    const { id } = req.params;

    // Evitar que el admin se borre a sí mismo
    if (Number(id) === req.usuario.id) {
      return res.status(400).json({ mensaje: 'No puedes eliminar tu propia cuenta de administrador' });
    }

    await db.query('DELETE FROM usuarios WHERE id = ?', [id]);
    return res.json({ mensaje: 'Empleado eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar empleado:', error);
    return res.status(500).json({ mensaje: 'Error al eliminar al empleado' });
  }
};
module.exports = {
  registrarUsuario,
  loginUsuario,
  obtenerPerfil,
  crearEmpleado,
  obtenerEmpleados,
  actualizarEmpleado,
  eliminarEmpleado
};