// frontend/src/pages/Login.jsx
import { useState } from 'react';
import { useSearchParams,useNavigate, } from 'react-router-dom';
import { apiClient } from '../api/cliente';
import { useAuth } from '../context/AuthContext';


export default function Login() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  // El estado se calcula directamente del parámetro de la URL:
  const esRegistro = searchParams.get('modo') === 'registro';

  const [cargando, setCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState('');

  // Formulario ajustado únicamente a los 5 datos requeridos
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    telefono: '',
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensajeError('');
    setCargando(true);

    const endpoint = esRegistro ? '/usuarios/registro' : '/usuarios/login';
    const payload = esRegistro
      ? formData
      : { email: formData.email, password: formData.password };

    try {
      const data = await apiClient(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // Aseguramos compatibilidad si el backend envía data.usuario o data.user
      const usuarioData = data.usuario || data.user;

      // 1. Notificar a React a través del contexto
      if (login && usuarioData) {
        login(usuarioData, data.token);
      }

      // 2. Guardar en localStorage usando 'user'
      if (data.token) localStorage.setItem('token', data.token);
      if (usuarioData) localStorage.setItem('user', JSON.stringify(usuarioData));

      // 3. Redirigir
      navigate('/');
    } catch (err) {
      setMensajeError(err.message || 'Error al procesar la solicitud');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🍰 Pastelería Artesanal</h2>

        {/* Pestañas para alternar entre Iniciar Sesión y Registro */}
                <div style={styles.tabContainer}>
        <button
            type="button"
            onClick={() => {
            searchParams.delete('modo');
            setSearchParams(searchParams);
            }}
            style={!esRegistro ? styles.tabActiva : styles.tabInactiva}
        >
            Iniciar Sesión
        </button>

        <button
            type="button"
            onClick={() => {
            searchParams.set('modo', 'registro');
            setSearchParams(searchParams);
            }}
            style={esRegistro ? styles.tabActiva : styles.tabInactiva}
        >
            Crear Cuenta
        </button>
        </div>

        {mensajeError && <div style={styles.errorBanner}>{mensajeError}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {esRegistro && (
            <>
              <div style={styles.field}>
                <label style={styles.label}>Nombre(s) *</label>
                <input
                  type="text"
                  name="nombre"
                  required
                  placeholder="Ej. Melissa"
                  value={formData.nombre}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Apellidos *</label>
                <input
                  type="text"
                  name="apellidos"
                  required
                  placeholder="Ej. Gómez"
                  value={formData.apellidos}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Teléfono celular *</label>
                <input
                  type="tel"
                  name="telefono"
                  required
                  placeholder="8112345678"
                  value={formData.telefono}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
            </>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Correo Electrónico *</label>
            <input
              type="email"
              name="email"
              required
              placeholder="cliente@correo.com"
              value={formData.email}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Contraseña *</label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            style={cargando ? styles.botonDeshabilitado : styles.boton}
          >
            {cargando ? 'Procesando...' : esRegistro ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '80vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    border: '1px solid #f0e6e0'
  },
  title: {
    textAlign: 'center',
    marginBottom: '20px',
    color: '#4a2c2a'
  },
  tabContainer: {
    display: 'flex',
    borderBottom: '2px solid #f0e6e0',
    marginBottom: '20px'
  },
  tabActiva: {
    flex: 1,
    padding: '10px',
    border: 'none',
    borderBottom: '3px solid #d97706',
    background: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
    color: '#d97706'
  },
  tabInactiva: {
    flex: 1,
    padding: '10px',
    border: 'none',
    background: 'none',
    color: '#71717a',
    cursor: 'pointer'
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '15px',
    fontSize: '14px',
    textAlign: 'center'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151'
  },
  input: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px'
  },
  boton: {
    marginTop: '10px',
    padding: '12px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#d97706',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  botonDeshabilitado: {
    marginTop: '10px',
    padding: '12px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#fcd34d',
    color: '#ffffff',
    cursor: 'not-allowed'
  }
};