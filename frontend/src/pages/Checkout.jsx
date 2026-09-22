// frontend/src/pages/Checkout.jsx
import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCarrito } from '../context/CarritoContext';
import { apiClient } from '../api/cliente';

const SUCURSAL_FIJA = {
  nombre: 'Sucursal Matriz San Nicolás',
  direccion: 'Palacio de Justicia 151, Col. Anáhuac, 66450 San Nicolás de los Garza, N.L., México',
  horario: 'Lunes a Domingo: 9:00 AM - 9:00 PM'
};

const MUNICIPIOS_NL = [
  'General Escobedo',
  'San Nicolás de los Garza',
  'Apodaca',
  'Monterrey',
  'Guadalupe',
  'San Pedro Garza García',
  'Santa Catarina',
  'Juárez',
  'García',
  'Cadereyta Jiménez',
  'Santiago'
];

export default function Checkout() {
  const navigate = useNavigate();
  const { carrito, totalPrecio, totalItems, vaciarCarrito } = useCarrito();

  // 1. Verificación estricta de sesión
  const token = localStorage.getItem('token');
  const usuarioRaw = localStorage.getItem('user') || localStorage.getItem('usuario');

  const usuario = (() => {
    try {
      return usuarioRaw ? JSON.parse(usuarioRaw) : null;
    } catch {
      return null;
    }
  })();

  const estaAutenticado = Boolean(token && usuario && (usuario.id || usuario.email));

  // Redirección inmediata si no está registrado/logueado
  useEffect(() => {
    if (!estaAutenticado) {
      navigate('/login?redirect=/checkout&modo=registro');
    }
  }, [estaAutenticado, navigate]);

  const [tipoEntrega, setTipoEntrega] = useState('domicilio');

  const [formData, setFormData] = useState({
    calle: '',
    numero: '',
    colonia: '',
    codigoPostal: '',
    municipio: '',
    indicaciones: ''
  });

  const [sucursalData, setSucursalData] = useState({
    fechaHoraRecogida: '',
    personaRecoge: ''
  });

  const [metodoPago, setMetodoPago] = useState('tarjeta');
  const [confirmado, setConfirmado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDomicilioChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSucursalChange = (e) => {
    setSucursalData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const direccionQuery = useMemo(() => {
    if (tipoEntrega === 'sucursal') {
      return encodeURIComponent(SUCURSAL_FIJA.direccion);
    }

    const partes = [
      formData.calle,
      formData.numero,
      formData.colonia,
      formData.codigoPostal,
      formData.municipio,
      'Nuevo León',
      'México'
    ].filter(Boolean);

    if (partes.length <= 2) return encodeURIComponent('Nuevo León, México');

    return encodeURIComponent(partes.join(', '));
  }, [formData, tipoEntrega]);

  const mapSrc = useMemo(() => {
    return `https://maps.google.com/maps?q=${direccionQuery}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
  }, [direccionQuery]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!estaAutenticado) {
      navigate('/login?redirect=/checkout&modo=registro');
      return;
    }

    if (!confirmado) {
      setError('Debes confirmar que revisaste los datos de entrega antes de continuar.');
      return;
    }

    if (carrito.length === 0) {
      setError('Tu carrito está vacío. Agrega productos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let detalleEntregaFinal = '';

      if (tipoEntrega === 'domicilio') {
        if (!formData.municipio) {
          throw new Error('Por favor selecciona un municipio de Nuevo León');
        }
        detalleEntregaFinal = `Domicilio: ${formData.calle} #${formData.numero}, Col. ${formData.colonia}, C.P. ${formData.codigoPostal}, ${formData.municipio}, N.L., México. Ref: ${formData.indicaciones || 'Sin indicaciones'}`;
      } else {
        detalleEntregaFinal = `Recoger en sucursal: ${SUCURSAL_FIJA.nombre} (${SUCURSAL_FIJA.direccion}). Recoge: ${sucursalData.personaRecoge}. Horario: ${sucursalData.fechaHoraRecogida}`;
      }

      // 1. Paso A: Crear el pedido en la base de datos
      const res = await apiClient('/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tipo_entrega: tipoEntrega,
          direccion_envio: detalleEntregaFinal,
          metodo_pago: metodoPago,
          total: totalPrecio,
          items: carrito.map((item) => ({
            producto_id: item.id,
            cantidad: item.cantidad,
            precio_unitario: Number(item.precio)
          }))
        })
      });

      // Extraer el ID generado para el pedido
      const nuevoPedidoId = res.pedidoId || res.id;

      // 2. Paso B: Llamar a pago.controller para procesar la transacción y generar el folio
      const resPago = await apiClient('/pagos/procesar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pedido_id: nuevoPedidoId,
          metodo_pago: metodoPago,
          monto: totalPrecio,
          datos_tarjeta: {
            numero: '4152313131314567' // Número ficticio para la simulación
          }
        })
      });

      vaciarCarrito();
      
      const folioRef = resPago.referencia_transaccion 
        ? `\nRef de Pago: ${resPago.referencia_transaccion}` 
        : '';
        
      alert(`¡Pedido #${nuevoPedidoId} realizado con éxito!${folioRef}`);
      
      // Redirigir al cliente a rastrear su compra
      navigate('/mis-pedidos');
    } catch (err) {
      setError(err.message || 'Error al procesar el pedido');
    } finally {
      setLoading(false);
    }
  };

  // 1. Carrito vacío
  if (carrito.length === 0) {
    return (
      <div style={styles.vacioContainer}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛒</div>
        <h2 style={{ color: '#4a2c2a', marginBottom: '8px' }}>Tu carrito está vacío</h2>
        <p style={{ color: '#6b7280', marginBottom: '20px' }}>
          Agrega algunos pasteles antes de pasar por caja.
        </p>
        <Link to="/" style={styles.btnVolver}>
          Ir al Catálogo
        </Link>
      </div>
    );
  }

  // 2. Si no está autenticado, no renderizamos nada mientras el useEffect redirige
  if (!estaAutenticado) {
    return null;
  }

  // 3. Formulario accesible únicamente para usuarios registrados y con productos
  return (
    <div style={styles.container}>
      <h2 style={styles.titulo}>Finalizar Compra</h2>

      <div style={styles.resumenPedido}>
        <span style={{ fontWeight: '600', color: '#4b5563' }}>
          Resumen: {totalItems} pieza(s)
        </span>
        <span style={{ fontWeight: '700', color: '#d97706', fontSize: '16px' }}>
          Total: ${totalPrecio.toFixed(2)} MXN
        </span>
      </div>

      {error && <div style={styles.alertaError}>{error}</div>}

      <div style={styles.pestanas}>
        <button
          type="button"
          onClick={() => {
            setTipoEntrega('domicilio');
            setConfirmado(false);
          }}
          style={{
            ...styles.tabBoton,
            ...(tipoEntrega === 'domicilio' ? styles.tabBotonActivo : {})
          }}
        >
          🛵 Entrega a Domicilio
        </button>
        <button
          type="button"
          onClick={() => {
            setTipoEntrega('sucursal');
            setConfirmado(false);
          }}
          style={{
            ...styles.tabBoton,
            ...(tipoEntrega === 'sucursal' ? styles.tabBotonActivo : {})
          }}
        >
          🏪 Recoger en Sucursal
        </button>
      </div>

      <form onSubmit={handleSubmit} style={styles.formulario}>
        {tipoEntrega === 'domicilio' && (
          <>
            <div style={styles.fila}>
              <div style={{ flex: 3 }}>
                <label style={styles.label}>Calle *</label>
                <input
                  type="text"
                  name="calle"
                  required
                  value={formData.calle}
                  onChange={handleDomicilioChange}
                  placeholder="Nombre de la calle"
                  style={styles.input}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Número *</label>
                <input
                  type="text"
                  name="numero"
                  required
                  value={formData.numero}
                  onChange={handleDomicilioChange}
                  placeholder="100"
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.fila}>
              <div style={{ flex: 2 }}>
                <label style={styles.label}>Colonia *</label>
                <input
                  type="text"
                  name="colonia"
                  required
                  value={formData.colonia}
                  onChange={handleDomicilioChange}
                  placeholder="Colonia"
                  style={styles.input}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Código Postal *</label>
                <input
                  type="text"
                  name="codigoPostal"
                  required
                  value={formData.codigoPostal}
                  onChange={handleDomicilioChange}
                  placeholder="C.P."
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.fila}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Municipio (Nuevo León) *</label>
                <select
                  name="municipio"
                  required
                  value={formData.municipio}
                  onChange={handleDomicilioChange}
                  style={styles.input}
                >
                  <option value="">Selecciona tu municipio...</option>
                  {MUNICIPIOS_NL.map((mun) => (
                    <option key={mun} value={mun}>
                      {mun}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Estado</label>
                <input
                  type="text"
                  value="Nuevo León, México"
                  disabled
                  style={{ ...styles.input, backgroundColor: '#f3f4f6', color: '#6b7280' }}
                />
              </div>
            </div>

            <div>
              <label style={styles.label}>Indicaciones para el repartidor</label>
              <textarea
                name="indicaciones"
                rows="2"
                value={formData.indicaciones}
                onChange={handleDomicilioChange}
                placeholder="Color de fachada, portón o referencias de cruces..."
                style={styles.textarea}
              />
            </div>
          </>
        )}

        {tipoEntrega === 'sucursal' && (
          <>
            <div style={styles.tarjetaSucursal}>
              <strong style={{ color: '#1f2937', fontSize: '15px' }}>📍 {SUCURSAL_FIJA.nombre}</strong>
              <p style={{ margin: '6px 0 2px 0', fontSize: '13px', color: '#4b5563' }}>
                {SUCURSAL_FIJA.direccion}
              </p>
              <span style={{ fontSize: '12px', color: '#059669', fontWeight: '500' }}>
                ⏰ {SUCURSAL_FIJA.horario}
              </span>
            </div>

            <div style={styles.fila}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Fecha y Hora estimada de recogida *</label>
                <input
                  type="datetime-local"
                  name="fechaHoraRecogida"
                  required
                  value={sucursalData.fechaHoraRecogida}
                  onChange={handleSucursalChange}
                  style={styles.input}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Nombre de quien recoge *</label>
                <input
                  type="text"
                  name="personaRecoge"
                  required
                  placeholder="Nombre completo"
                  value={sucursalData.personaRecoge}
                  onChange={handleSucursalChange}
                  style={styles.input}
                />
              </div>
            </div>
          </>
        )}

        <div style={styles.seccionMapa}>
          <div style={styles.encabezadoMapa}>
            <span style={{ fontWeight: '600', color: '#374151' }}>
              📍 {tipoEntrega === 'domicilio' ? 'Ubicación de entrega:' : 'Punto de recogida:'}
            </span>
            <a
              href={`https://maps.google.com/?q=${direccionQuery}`}
              target="_blank"
              rel="noreferrer"
              style={styles.linkMaps}
            >
              Abrir en Maps ↗
            </a>
          </div>
          <iframe
            title="Mapa"
            width="100%"
            height="210"
            style={{ border: 0, borderRadius: '8px', marginTop: '8px' }}
            loading="lazy"
            src={mapSrc}
          />
        </div>

        <div style={{ marginTop: '12px' }}>
          <label style={styles.label}>Método de Pago</label>
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
            style={styles.input}
          >
            <option value="tarjeta">Tarjeta de Débito / Crédito</option>
            <option value="transferencia">Transferencia bancaria</option>
            <option value="efectivo">
              {tipoEntrega === 'domicilio' ? 'Pago en efectivo contra entrega' : 'Pago al recoger en mostrador'}
            </option>
          </select>
        </div>

        <div style={styles.contenedorCheckbox}>
          <input
            type="checkbox"
            id="confirmarCheck"
            checked={confirmado}
            onChange={(e) => setConfirmado(e.target.checked)}
            required
            style={styles.checkbox}
          />
          <label htmlFor="confirmarCheck" style={styles.labelCheckbox}>
            {tipoEntrega === 'domicilio'
              ? 'Confirmo que revisé la vista previa del mapa y mi dirección de entrega es correcta.'
              : 'Confirmo que acudiré a la sucursal de San Nicolás en la fecha y horario seleccionados.'}
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !confirmado}
          style={{
            ...styles.btnConfirmar,
            opacity: loading || !confirmado ? 0.6 : 1,
            cursor: loading || !confirmado ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Procesando pedido...' : `Confirmar y Pagar $${(totalPrecio || 0).toFixed(2)} MXN`}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: { maxWidth: '640px', margin: '30px auto', padding: '24px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' },
  titulo: { color: '#4a2c2a', margin: '0 0 12px 0', fontSize: '22px', textAlign: 'center' },
  resumenPedido: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '10px 14px', borderRadius: '8px', marginBottom: '18px' },
  pestanas: { display: 'flex', gap: '8px', marginBottom: '20px' },
  tabBoton: { flex: 1, padding: '10px', border: '1px solid #d1d5db', background: '#f9fafb', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', color: '#4b5563', transition: 'all 0.2s' },
  tabBotonActivo: { background: '#d97706', color: '#fff', borderColor: '#d97706', fontWeight: '600' },
  formulario: { display: 'flex', flexDirection: 'column', gap: '14px' },
  fila: { display: 'flex', gap: '12px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#4b5563', marginBottom: '4px' },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' },
  tarjetaSucursal: { padding: '14px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' },
  seccionMapa: { marginTop: '10px', padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' },
  encabezadoMapa: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  linkMaps: { fontSize: '13px', color: '#2563eb', textDecoration: 'none', fontWeight: '500' },
  contenedorCheckbox: { display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '10px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' },
  checkbox: { width: '18px', height: '18px', accentColor: '#d97706', cursor: 'pointer', marginTop: '2px' },
  labelCheckbox: { fontSize: '13px', color: '#374151', cursor: 'pointer', lineHeight: '1.4' },
  btnConfirmar: { marginTop: '14px', padding: '12px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600' },
  alertaError: { padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '10px', fontSize: '14px' },
  vacioContainer: { maxWidth: '450px', margin: '60px auto', padding: '30px 20px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' },
  btnVolver: { display: 'inline-block', backgroundColor: '#8b4513', color: '#ffffff', textDecoration: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '600', fontSize: '14px' }
};