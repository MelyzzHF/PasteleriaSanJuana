// frontend/src/pages/Checkout.jsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCarrito } from '../context/CarritoContext';
import { apiClient, API_URL } from '../api/cliente';

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

const COSTO_ENVIO_DOMICILIO = 35;

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


const HORA_APERTURA = 9;
const HORA_CIERRE = 20;

function formatoFechaLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function calcularFechaMinima() {
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  return formatoFechaLocal(manana);
}

function esDomingo(fechaStr) {
  if (!fechaStr) return false;
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() === 0;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { carrito, totalPrecio, totalItems, vaciarCarrito } = useCarrito();

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
    personaRecoge: ''
  });

  const [entregaFecha, setEntregaFecha] = useState('');
  const [entregaHora, setEntregaHora] = useState('');
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [cargandoDisponibilidad, setCargandoDisponibilidad] = useState(false);
  const [erroreFechaHora, setErrorFechaHora] = useState('');

  const fechaMinimaSeleccionable = calcularFechaMinima();

  
  useEffect(() => {
    if (!entregaFecha) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisponibilidad(null);
      return;
    }

    if (esDomingo(entregaFecha)) {
      setErrorFechaHora('No se reciben pedidos los domingos. Elige otro día.');
      setDisponibilidad(null);
      return;
    }

    let activo = true;
    setCargandoDisponibilidad(true);
    setErrorFechaHora('');

    apiClient(`/pedidos/disponibilidad?fecha=${entregaFecha}`)
      .then((data) => {
        if (!activo) return;
        setDisponibilidad(data);
        const infoTipo = data[tipoEntrega];
        if (infoTipo?.lleno) {
          setErrorFechaHora(
            `Ya no hay cupo de ${tipoEntrega === 'domicilio' ? 'domicilio' : 'sucursal'} para ese día.`
          );
        }
        const horaSigueValida = infoTipo?.horas?.some((h) => h.hora === entregaHora && h.disponible);
        if (entregaHora && !horaSigueValida) {
          setEntregaHora('');
        }
      })
      .catch((err) => {
        if (activo) setErrorFechaHora(err.message || 'No se pudo consultar la disponibilidad.');
      })
      .finally(() => {
        if (activo) setCargandoDisponibilidad(false);
      });

    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entregaFecha, tipoEntrega]);

  const buscarProximaFechaDisponible = async () => {
    try {
      const data = await apiClient(
        `/pedidos/proxima-fecha-disponible?tipo_entrega=${tipoEntrega}&desde=${entregaFecha || fechaMinimaSeleccionable}`
      );
      setEntregaFecha(data.fecha);
      setEntregaHora('');
    } catch (err) {
      setErrorFechaHora(err.message || 'No se encontró una fecha disponible próximamente.');
    }
  };

  const [metodoPago, setMetodoPago] = useState('tarjeta');
  const [confirmado, setConfirmado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [modalPago, setModalPago] = useState({
    visible: false,
    fase: 'procesando',
    mensaje: '',
    pedidoId: null,
    referencia: null
  });


  const [resumenSnapshot, setResumenSnapshot] = useState(null);

  const pedidoEnProcesoRef = useRef(null);


  const [pagoEnProceso, setPagoEnProceso] = useState(false);

  const declinarPedidoEnProceso = async (motivo) => {
    const enProceso = pedidoEnProcesoRef.current;
    if (!enProceso) return;
    try {
      await apiClient(`/pedidos/${enProceso.pedidoId}/declinar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelToken: enProceso.cancelToken, motivo })
      });
    } catch (err) {
      console.error('No se pudo declinar el pedido:', err);
    }
  };

  useEffect(() => {
    if (!pagoEnProceso) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const handlePageHide = () => {
      const enProceso = pedidoEnProcesoRef.current;
      if (!enProceso) return;
      const payload = JSON.stringify({
        cancelToken: enProceso.cancelToken,
        motivo: 'El cliente cerró o recargó la ventana antes de confirmar el pago.'
      });
      const blob = new Blob([payload], { type: 'application/json' });
      
      navigator.sendBeacon(`${API_URL}/pedidos/${enProceso.pedidoId}/declinar`, blob);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [pagoEnProceso]);

  useEffect(() => {
    if (!pagoEnProceso) return;

    const rutaActual = window.location.pathname + window.location.search;
    window.history.pushState(null, '', rutaActual);

    let salidaConfirmada = false;

    const handlePopState = async () => {
      if (salidaConfirmada) {
        salidaConfirmada = false;
        return;
      }

      const quiereSalir = window.confirm(
        '¿Estás seguro de que quieres salir de esta ventana? Si sales, tu pedido se cancelará.'
      );

      if (quiereSalir) {
        await declinarPedidoEnProceso('El cliente decidió salir del checkout antes de confirmar el pago.');
        salidaConfirmada = true;
        window.history.back(); 
      } else {
        window.history.pushState(null, '', rutaActual);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [pagoEnProceso]);

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

  const costoEnvio = tipoEntrega === 'domicilio' ? COSTO_ENVIO_DOMICILIO : 0;
  const totalFinal = (totalPrecio || 0) + costoEnvio;

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

    if (tipoEntrega === 'domicilio' && !formData.municipio) {
      setError('Por favor selecciona un municipio de Nuevo León');
      return;
    }

    if (!entregaFecha || !entregaHora) {
      setError('Elige una fecha y hora de entrega/recolección válidas.');
      return;
    }

    if (esDomingo(entregaFecha)) {
      setError('No se reciben pedidos los domingos.');
      return;
    }

    if (disponibilidad?.[tipoEntrega]?.lleno) {
      setError('Ese día ya no tiene cupo disponible. Elige otra fecha.');
      return;
    }

    const fechaEntregaCompleta = `${entregaFecha}T${entregaHora}:00`;

    setLoading(true);
    setError('');


    setResumenSnapshot({
      items: carrito,
      totalItems,
      subtotal: totalPrecio || 0,
      costoEnvio,
      totalFinal,
      tipoEntrega
    });

    setModalPago({
      visible: true,
      fase: 'procesando',
      mensaje: 'Ingresando datos de tarjeta...',
      pedidoId: null,
      referencia: null
    });

    try {
      let detalleEntregaFinal = '';

      if (tipoEntrega === 'domicilio') {
        detalleEntregaFinal = `Domicilio: ${formData.calle} #${formData.numero}, Col. ${formData.colonia}, C.P. ${formData.codigoPostal}, ${formData.municipio}, N.L., México. Ref: ${formData.indicaciones || 'Sin indicaciones'}. Entrega: ${entregaFecha} ${entregaHora}`;
      } else {
        detalleEntregaFinal = `Recoger en sucursal: ${SUCURSAL_FIJA.nombre} (${SUCURSAL_FIJA.direccion}). Recoge: ${sucursalData.personaRecoge}. Horario: ${entregaFecha} ${entregaHora}`;
      }

      await esperar(1100);

      setModalPago((prev) => ({ ...prev, mensaje: 'Verificando información con el banco...' }));

      const res = await apiClient('/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tipo_entrega: tipoEntrega,
          direccion_envio: detalleEntregaFinal,
          fecha_entrega: fechaEntregaCompleta,
          metodo_pago: metodoPago,
          costo_envio: costoEnvio,
          total: totalFinal,
          items: carrito.map((item) => ({
            producto_id: item.id,
            cantidad: item.cantidad,
            precio_unitario: Number(item.precio)
          }))
        })
      });

      const nuevoPedidoId = res.pedidoId || res.id;

     
      pedidoEnProcesoRef.current = { pedidoId: nuevoPedidoId, cancelToken: res.cancelToken };
      setPagoEnProceso(true);

      setModalPago((prev) => ({ ...prev, mensaje: 'Procesando el pago, no cierres esta ventana...' }));

      await esperar(900);

      const resPago = await apiClient('/pagos/procesar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pedido_id: nuevoPedidoId,
          metodo_pago: metodoPago,
          monto: totalFinal,
          datos_tarjeta: {
            numero: '4152313131314567' 
          }
        })
      });

      vaciarCarrito();

      pedidoEnProcesoRef.current = null;
      setPagoEnProceso(false);

      setModalPago({
        visible: true,
        fase: 'exito',
        mensaje: '',
        pedidoId: nuevoPedidoId,
        referencia: resPago.referencia_transaccion || null
      });
    } catch (err) {
   
      pedidoEnProcesoRef.current = null;
      setPagoEnProceso(false);

      setModalPago({
        visible: true,
        fase: 'error',
        mensaje: err.message || 'No se pudo procesar el pedido. Intenta de nuevo.',
        pedidoId: null,
        referencia: null
      });
    } finally {
      setLoading(false);
    }
  };

  const cerrarModalYRedirigir = () => {
    setModalPago((prev) => ({ ...prev, visible: false }));
    navigate('/mis-pedidos');
  };

  const cerrarModalError = () => {
    setModalPago((prev) => ({ ...prev, visible: false }));
  
    setResumenSnapshot(null);
  };


  if (carrito.length === 0 && !modalPago.visible) {
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

  if (!estaAutenticado) {
    return null;
  }

  return (
    <div style={styles.pageContainer}>
      <style>{estilosGlobales}</style>

      <h2 style={styles.titulo}>Finalizar Compra</h2>

      {error && <div style={styles.alertaError}>{error}</div>}

      <div style={styles.gridLayout} className="checkout-grid">
        {/* Columna izquierda: datos de entrega */}
        <div style={styles.columnaIzquierda}>
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
                    <label htmlFor="calle" style={styles.label}>Calle *</label>
                    <input id="calle"
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
                    <label htmlFor="numero" style={styles.label}>Número *</label>
                    <input id="numero"
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
                    <label htmlFor="colonia" style={styles.label}>Colonia *</label>
                    <input id= "colonia"
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
                    <label htmlFor="codigo" style={styles.label}>Código Postal *</label>
                    <input id="codigo" 
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
                    <label htmlFor="municipio" style={styles.label}>Municipio (Nuevo León) *</label>
                    <select id="municipio"
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
                    <label htmlFor="estado" style={styles.label}>Estado</label>
                    <input id="estado"
                      type="text"
                      value="Nuevo León, México"
                      disabled
                      style={{ ...styles.input, backgroundColor: '#f3f4f6', color: '#6b7280' }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="indicaciones" style={styles.label}>Indicaciones para el repartidor</label>
                  <textarea id="indicaciones"
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
                    <label htmlFor="personaRecoge" style={styles.label}>Nombre de quien recoge *</label>
                    <input id="personaRecoge"
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

            {/* Selector de fecha y hora: aplica igual para domicilio y sucursal */}
            <div style={styles.seccionFechaHora}>
              <label  htmlFor="entregaFecha" style={styles.label}>
                {tipoEntrega === 'domicilio' ? 'Fecha y hora de entrega *' : 'Fecha y hora de recolección *'}
              </label>
              <p style={styles.notaHorario}>
                Horario de {HORA_APERTURA}:00 a {HORA_CIERRE + 1}:00, con al menos un día de
                anticipación. No se recibe los domingos.
              </p>

              <div style={styles.fila}>
                <div style={{ flex: 1 }}>
                  <input id= "entregaFecha"
                    type="date"
                    min={fechaMinimaSeleccionable}
                    value={entregaFecha}
                    onChange={(e) => {
                      setEntregaFecha(e.target.value);
                      setEntregaHora('');
                    }}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <select
                    id="entregaHora"
                    aria-label="Hora"
                    value={entregaHora}
                    onChange={(e) => setEntregaHora(e.target.value)}
                    style={styles.input}
                    required
                    disabled={!entregaFecha || !disponibilidad || disponibilidad[tipoEntrega]?.lleno}
                  >
                    <option value="">
                      {cargandoDisponibilidad ? 'Consultando horarios...' : 'Selecciona una hora...'}
                    </option>
                    {disponibilidad?.[tipoEntrega]?.horas.map((h) => (
                      <option key={h.hora} value={h.hora} disabled={!h.disponible}>
                        {h.hora} {h.disponible ? '' : '— No disponible'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {erroreFechaHora && (
                <div style={styles.avisoFechaHora}>
                  ⚠️ {erroreFechaHora}
                  <button type="button" onClick={buscarProximaFechaDisponible} style={styles.btnProximaFecha}>
                    Buscar próxima fecha disponible
                  </button>
                </div>
              )}
            </div>

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
              {loading ? 'Procesando pedido...' : `Confirmar y Pagar $${totalFinal.toFixed(2)} MXN`}
            </button>
          </form>
        </div>

        {/* Columna derecha: resumen del pedido.
            Mientras se está pagando (o ya se pagó) usamos la foto congelada
            (resumenSnapshot) en vez del carrito en vivo, que puede vaciarse
            a mitad del proceso. */}
        <div style={styles.columnaDerecha}>
          <ResumenPedido
            carrito={resumenSnapshot ? resumenSnapshot.items : carrito}
            totalItems={resumenSnapshot ? resumenSnapshot.totalItems : totalItems}
            subtotal={resumenSnapshot ? resumenSnapshot.subtotal : (totalPrecio || 0)}
            costoEnvio={resumenSnapshot ? resumenSnapshot.costoEnvio : costoEnvio}
            tipoEntrega={resumenSnapshot ? resumenSnapshot.tipoEntrega : tipoEntrega}
            totalFinal={resumenSnapshot ? resumenSnapshot.totalFinal : totalFinal}
          />
        </div>
      </div>

      {modalPago.visible && (
        <ModalPago
          fase={modalPago.fase}
          mensaje={modalPago.mensaje}
          pedidoId={modalPago.pedidoId}
          referencia={modalPago.referencia}
          total={resumenSnapshot ? resumenSnapshot.totalFinal : totalFinal}
          onVerPedidos={cerrarModalYRedirigir}
          onCerrarError={cerrarModalError}
        />
      )}
    </div>
  );
}

function ResumenPedido({ carrito, totalItems, subtotal, costoEnvio, tipoEntrega, totalFinal }) {
  return (
    <div style={styles.resumenCard}>
      <h3 style={styles.resumenTitulo}>🧾 Resumen de tu pedido</h3>
      <p style={styles.resumenSubtitulo}>{totalItems} pieza(s)</p>

      <div style={styles.listaProductos}>
        {carrito.map((item) => {
          const imagen = item.imagen || item.foto || item.image || item.foto_url || null;
          const subtotalItem = Number(item.precio) * item.cantidad;
          return (
            <div key={item.id} style={styles.itemFila}>
              <div style={styles.itemImagenContenedor}>
                {imagen ? (
                  <img src={imagen} alt={item.nombre} style={styles.itemImagen} />
                ) : (
                  <div style={styles.itemImagenPlaceholder}>🎂</div>
                )}
              </div>
              <div style={styles.itemInfo}>
                <span style={styles.itemNombre}>{item.nombre}</span>
                <span style={styles.itemCantidad}>
                  x{item.cantidad} · ${Number(item.precio).toFixed(2)}
                </span>
              </div>
              <span style={styles.itemSubtotal}>${subtotalItem.toFixed(2)}</span>
            </div>
          );
        })}
      </div>

      <div style={styles.resumenDivider} />

      <div style={styles.resumenFila}>
        <span>Subtotal</span>
        <span>${subtotal.toFixed(2)} MXN</span>
      </div>

      <div style={styles.resumenFila}>
        <span>{tipoEntrega === 'domicilio' ? 'Comisión por entrega a domicilio' : 'Recolección en sucursal'}</span>
        <span>{costoEnvio > 0 ? `$${costoEnvio.toFixed(2)} MXN` : 'Gratis'}</span>
      </div>

      <div style={styles.resumenDivider} />

      <div style={styles.resumenTotalFila}>
        <span>Total</span>
        <span>${totalFinal.toFixed(2)} MXN</span>
      </div>
    </div>
  );
}

function ModalPago({ fase, mensaje, pedidoId, referencia, total, onVerPedidos, onCerrarError }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCaja}>
        {fase === 'procesando' && (
          <>
            <div className="checkout-spinner" style={styles.spinner} />
            <h3 style={styles.modalTitulo}>Procesando tu pago</h3>
            <p style={styles.modalMensaje}>{mensaje}</p>
          </>
        )}

        {fase === 'exito' && (
          <>
            <div style={styles.modalIconoExito}>✓</div>
            <h3 style={{ ...styles.modalTitulo, color: '#065f46' }}>¡Pago exitoso!</h3>
            <p style={styles.modalMensaje}>
              Tu pedido #{pedidoId} se realizó correctamente.
            </p>
            <div style={styles.modalDetalle}>
              <div style={styles.modalDetalleFila}>
                <span>Total pagado</span>
                <span style={{ fontWeight: '700' }}>${total.toFixed(2)} MXN</span>
              </div>
              {referencia && (
                <div style={styles.modalDetalleFila}>
                  <span>Referencia de pago</span>
                  <span style={{ fontWeight: '600' }}>{referencia}</span>
                </div>
              )}
            </div>
            <button style={styles.modalBotonExito} onClick={onVerPedidos}>
              Ver mis pedidos
            </button>
          </>
        )}

        {fase === 'error' && (
          <>
            <div style={styles.modalIconoError}>✕</div>
            <h3 style={{ ...styles.modalTitulo, color: '#991b1b' }}>No se pudo procesar el pago</h3>
            <p style={styles.modalMensaje}>{mensaje}</p>
            <button style={styles.modalBotonError} onClick={onCerrarError}>
              Cerrar e intentar de nuevo
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const estilosGlobales = `
  @keyframes checkout-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .checkout-spinner {
    animation: checkout-spin 0.9s linear infinite;
  }
  @media (max-width: 860px) {
    .checkout-grid {
      grid-template-columns: 1fr !important;
    }
  }
`;

const styles = {
  pageContainer: { maxWidth: '980px', margin: '30px auto', padding: '0 16px' },
  titulo: { color: '#4a2c2a', margin: '0 0 16px 0', fontSize: '22px', textAlign: 'center' },

  gridLayout: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr',
    gap: '20px',
    alignItems: 'start'
  },

  columnaIzquierda: {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    padding: '24px'
  },
  columnaDerecha: {
    position: 'sticky',
    top: '16px'
  },

  pestanas: { display: 'flex', gap: '8px', marginBottom: '20px' },
  tabBoton: { flex: 1, padding: '10px', border: '1px solid #d1d5db', background: '#f9fafb', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', color: '#4b5563', transition: 'all 0.2s' },
  tabBotonActivo: { background: '#d97706', color: '#fff', borderColor: '#d97706', fontWeight: '600' },
  formulario: { display: 'flex', flexDirection: 'column', gap: '14px' },
  fila: { display: 'flex', gap: '12px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#4b5563', marginBottom: '4px' },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' },
  tarjetaSucursal: { padding: '14px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' },
  seccionFechaHora: { padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' },
  notaHorario: { fontSize: '12px', color: '#6b7280', margin: '2px 0 10px 0' },
  avisoFechaHora: { marginTop: '10px', padding: '10px 12px', background: '#fef2f2',color: '#991b1b',borderRadius: '6px',fontSize: '13px',display: 'flex',flexDirection: 'column',gap: '8px'},
  btnProximaFecha: {alignSelf: 'flex-start',padding: '6px 12px',background: '#991b1b',color: '#fff',border: 'none',borderRadius: '6px',cursor: 'pointer',fontSize: '12px',fontWeight: '600' },
  seccionMapa: { marginTop: '10px', padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' },
  encabezadoMapa: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  linkMaps: { fontSize: '13px', color: '#2563eb', textDecoration: 'none', fontWeight: '500' },
  contenedorCheckbox: { display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '10px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' },
  checkbox: { width: '18px', height: '18px', accentColor: '#d97706', cursor: 'pointer', marginTop: '2px' },
  labelCheckbox: { fontSize: '13px', color: '#374151', cursor: 'pointer', lineHeight: '1.4' },
  btnConfirmar: { marginTop: '14px', padding: '12px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600' },
  alertaError: { padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '10px', fontSize: '14px' },
  vacioContainer: { maxWidth: '450px', margin: '60px auto', padding: '30px 20px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' },
  btnVolver: { display: 'inline-block', backgroundColor: '#8b4513', color: '#ffffff', textDecoration: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '600', fontSize: '14px' },

  // Resumen del pedido
  resumenCard: { background: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', padding: '20px' },
  resumenTitulo: { margin: '0 0 2px 0', fontSize: '17px', color: '#4a2c2a' },
  resumenSubtitulo: { margin: '0 0 14px 0', fontSize: '13px', color: '#6b7280' },
  listaProductos: { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' },
  itemFila: { display: 'flex', alignItems: 'center', gap: '10px' },
  itemImagenContenedor: { width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#f3f4f6' },
  itemImagen: { width: '100%', height: '100%', objectFit: 'cover' },
  itemImagenPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },
  itemInfo: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  itemNombre: { fontSize: '13px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  itemCantidad: { fontSize: '12px', color: '#6b7280' },
  itemSubtotal: { fontSize: '13px', fontWeight: '600', color: '#4b5563', flexShrink: 0 },
  resumenDivider: { height: '1px', background: '#e5e7eb', margin: '14px 0' },
  resumenFila: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4b5563', marginBottom: '8px' },
  resumenTotalFila: { display: 'flex', justifyContent: 'space-between', fontSize: '17px', fontWeight: '700', color: '#d97706' },

  // Modal de pago
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' },
  modalCaja: { background: '#fff', borderRadius: '14px', padding: '32px 28px', maxWidth: '380px', width: '100%', textAlign: 'center', boxShadow: '0 12px 32px rgba(0,0,0,0.2)' },
  spinner: { width: '48px', height: '48px', border: '4px solid #fde68a', borderTopColor: '#d97706', borderRadius: '50%', margin: '0 auto 18px auto' },
  modalTitulo: { margin: '0 0 8px 0', fontSize: '18px', color: '#1f2937' },
  modalMensaje: { margin: 0, fontSize: '14px', color: '#6b7280', lineHeight: '1.4' },
  modalIconoExito: { width: '56px', height: '56px', borderRadius: '50%', background: '#d1fae5', color: '#059669', fontSize: '28px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' },
  modalIconoError: { width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', fontSize: '26px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' },
  modalDetalle: { background: '#f9fafb', borderRadius: '8px', padding: '12px 14px', margin: '16px 0', textAlign: 'left' },
  modalDetalleFila: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4b5563', padding: '3px 0' },
  modalBotonExito: { marginTop: '6px', width: '100%', padding: '11px', background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  modalBotonError: { marginTop: '18px', width: '100%', padding: '11px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }
};