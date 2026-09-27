// frontend/src/pages/Login.jsx
import { useState } from 'react';
import { useSearchParams,useNavigate, } from 'react-router-dom';
import { apiClient } from '../api/cliente';
import { useAuth } from '../context/AuthContext';


export default function Login() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const esRegistro = searchParams.get('modo') === 'registro';

  const [cargando, setCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState('');

  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    telefono: '',
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    // El teléfono solo acepta dígitos y se limita a 10
    if (name === 'telefono') {
      const soloDigitos = value.replace(/\D/g, '').slice(0, 10);
      setFormData({ ...formData, telefono: soloDigitos });
      return;
    }

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validarFormulario = () => {
    if (esRegistro && formData.telefono.length !== 10) {
      setMensajeError('El teléfono celular debe tener exactamente 10 dígitos.');
      return false;
    }

    if (formData.password.length < 6) {
      setMensajeError('La contraseña debe tener al menos 6 caracteres.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensajeError('');

    if (!validarFormulario()) {
      return;
    }

    setCargando(true);

    const endpoint = esRegistro ? '/usuarios/registro' : '/usuarios/login';
    const payload = esRegistro
      ? formData
      : { 
          email: formData.email ? formData.email.trim() : '', 
          password: formData.password 
        };

    try {
      const data = await apiClient(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const usuarioData = data.usuario || data.user;

      if (!data.token || !usuarioData) {
        throw new Error('La respuesta del servidor no incluyó token o datos de usuario.');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(usuarioData));
      localStorage.setItem('user', JSON.stringify(usuarioData));

      if (typeof login === 'function') {
        login(usuarioData, data.token);
      }

      navigate('/', { replace: true });
    } catch (err) {
      console.error('Error durante autenticación:', err);
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
            setMensajeError('');
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
            setMensajeError('');
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
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="8112345678"
                  value={formData.telefono}
                  onChange={handleChange}
                  style={styles.input}
                />
                <span style={styles.ayuda}>
                  {formData.telefono.length}/10 dígitos
                </span>
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
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              value={formData.password}
              onChange={handleChange}
              style={styles.input}
            />
            {esRegistro && (
              <span style={styles.ayuda}>Mínimo 6 caracteres</span>
            )}
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
  ayuda: {
    fontSize: '11px',
    color: '#9ca3af'
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