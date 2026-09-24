import { useState, useEffect } from 'react';
import { apiClient } from '../api/cliente';

export default function AdminEmpleados() {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  // Control de modal/formulario
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    telefono: '',
    rol: 'cocina'
  });

  const cargarEmpleados = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const data = await apiClient('/usuarios/empleados', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmpleados(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarEmpleados();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const abrirModalNuevo = () => {
    limpiarFormulario();
    setMostrarModal(true);
  };

  const iniciarEdicion = (emp) => {
    setEditandoId(emp.id);
    setFormData({
      nombre: emp.nombre,
      email: emp.email,
      password: '', // Por seguridad no se pide contraseña al editar
      telefono: emp.telefono || '',
      rol: emp.rol
    });
    setMostrarModal(true);
  };

  const limpiarFormulario = () => {
    setEditandoId(null);
    setFormData({ nombre: '', email: '', password: '', telefono: '', rol: 'cocina' });
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    limpiarFormulario();
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setError('');
    setMensajeExito('');
    const token = localStorage.getItem('token');

    try {
      if (editandoId) {
        await apiClient(`/usuarios/empleados/${editandoId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            nombre: formData.nombre,
            email: formData.email,
            telefono: formData.telefono,
            rol: formData.rol
          })
        });
        setMensajeExito('Empleado actualizado con éxito');
      } else {
        await apiClient('/usuarios/empleados', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });
        setMensajeExito('Empleado registrado exitosamente');
      }

      cerrarModal();
      cargarEmpleados();
    } catch (err) {
      setError(err.message || 'Error al procesar la solicitud');
    }
  };

  const handleEliminar = async (id, nombre) => {
    const confirmar = window.confirm(`¿Seguro que deseas eliminar al empleado ${nombre}?`);
    if (!confirmar) return;

    try {
      const token = localStorage.getItem('token');
      await apiClient(`/usuarios/empleados/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setMensajeExito(`Empleado ${nombre} eliminado.`);
      cargarEmpleados();
    } catch (err) {
      alert(err.message || 'No se pudo eliminar el empleado');
    }
  };

  return (
    <div style={styles.contenedor}>
      {/* Cabecera con Botón de Agregar Empleado */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.titulo}>👥 Gestión de Personal</h2>
          <p style={styles.subtitulo}>Administra las cuentas del equipo de Cocina y Reparto</p>
        </div>
        <button onClick={abrirModalNuevo} style={styles.btnNuevoEmpleado}>
          ➕ Agregar Empleado
        </button>
      </div>

      {mensajeExito && <div style={styles.alertaExito}>{mensajeExito}</div>}
      {error && <div style={styles.alertaError}>{error}</div>}

      {/* Modal / Ventana Emergente */}
      {mostrarModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: '#374151' }}>
                {editandoId ? '✏️ Editar Empleado' : '➕ Registrar Nuevo Empleado'}
              </h3>
              <button type="button" onClick={cerrarModal} style={styles.btnCerrarModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardar} style={styles.formulario}>
              <div style={styles.gridForm}>
                <div style={styles.campo}>
                  <label style={styles.label}>Nombre Completo *</label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Ej. Ana Gómez"
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.campo}>
                  <label style={styles.label}>Correo Electrónico *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="empleado@pasteleria.com"
                    style={styles.input}
                    required
                  />
                </div>

                {!editandoId && (
                  <div style={styles.campo}>
                    <label style={styles.label}>Contraseña *</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Mínimo 6 caracteres"
                      style={styles.input}
                      required
                    />
                  </div>
                )}

                <div style={styles.campo}>
                  <label style={styles.label}>Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    placeholder="Ej. 8112345678"
                    style={styles.input}
                  />
                </div>

                <div style={styles.campo}>
                  <label style={styles.label}>Rol *</label>
                  <select name="rol" value={formData.rol} onChange={handleChange} style={styles.select}>
                    <option value="cocina">👨‍🍳 Cocina / Horno</option>
                    <option value="repartidor">🛵 Repartidor</option>
                    <option value="admin">⭐ Administrador</option>
                  </select>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={cerrarModal} style={styles.btnCancelar}>
                  Cancelar
                </button>
                <button type="submit" style={styles.btnGuardar}>
                  {editandoId ? 'Guardar Cambios' : 'Registrar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla de Empleados Existentes */}
      <h3 style={{ marginTop: '20px', color: '#4a2c2a' }}>Personal Registrado</h3>

      {loading ? (
        <p style={{ color: '#6b7280' }}>Cargando equipo...</p>
      ) : empleados.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No hay empleados registrados aún.</p>
      ) : (
        <div style={styles.tablaContenedor}>
          <table style={styles.tabla}>
            <thead>
              <tr style={styles.filaHead}>
                <th style={styles.th}>Nombre</th>
                <th style={styles.th}>Correo</th>
                <th style={styles.th}>Teléfono</th>
                <th style={styles.th}>Rol</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empleados.map((emp) => (
                <tr key={emp.id} style={styles.filaBody}>
                  <td style={styles.td}><strong>{emp.nombre}</strong></td>
                  <td style={styles.td}>{emp.email}</td>
                  <td style={styles.td}>{emp.telefono || '—'}</td>
                  <td style={styles.td}>
                    <span style={emp.rol === 'admin' ? styles.badgeAdmin : emp.rol === 'cocina' ? styles.badgeCocina : styles.badgeRepartidor}>
                      {emp.rol.toUpperCase()}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => iniciarEdicion(emp)} style={styles.btnEditar}>
                      ✏️ Editar
                    </button>
                    <button onClick={() => handleEliminar(emp.id, emp.nombre)} style={styles.btnEliminar}>
                      🗑️ Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  contenedor: { maxWidth: '900px', margin: '30px auto', padding: '0 16px', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  titulo: { color: '#4a2c2a', margin: 0, fontSize: '24px' },
  subtitulo: { color: '#6b7280', margin: '4px 0 0 0', fontSize: '14px' },
  btnNuevoEmpleado: {
    backgroundColor: '#059669',
    color: '#fff',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '520px',
    padding: '24px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  btnCerrarModal: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#6b7280'
  },
  formulario: { display: 'flex', flexDirection: 'column', gap: '14px' },
  gridForm: { display: 'grid', gridTemplateColumns: '1fr', gap: '12px' },
  campo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#374151' },
  input: { padding: '9px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' },
  select: { padding: '9px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', background: '#fff' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' },
  btnGuardar: { backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  btnCancelar: { backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer' },
  alertaExito: { backgroundColor: '#ecfdf5', color: '#065f46', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' },
  alertaError: { backgroundColor: '#fef2f2', color: '#991b1b', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' },
  tablaContenedor: { overflowX: 'auto', marginTop: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' },
  tabla: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' },
  filaHead: { backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  th: { padding: '12px', color: '#4b5563', fontWeight: '600' },
  filaBody: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '12px', color: '#1f2937' },
  badgeAdmin: { background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  badgeCocina: { background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  badgeRepartidor: { background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' },
  btnEditar: { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '6px' },
  btnEliminar: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }
};