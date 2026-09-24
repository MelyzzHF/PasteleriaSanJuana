// frontend/src/pages/MisPedidos.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/cliente';

export default function MisPedidos() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token');

  // Consulta de pedidos del cliente
  const cargarPedidos = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiClient('/pedidos/mis-pedidos', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setPedidos(Array.isArray(data) ? data : data.pedidos || []);
    } catch (err) {
      setError(err.message || 'Error al obtener tus pedidos');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate('/login?redirect=/mis-pedidos');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarPedidos();
  }, [token, navigate, cargarPedidos]);

  const renderEstadoBadge = (estadoRaw) => {
    const estado = (estadoRaw || 'pendiente')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_');

    const configuraciones = {
      pendiente: { label: '⏳ Pendiente', bg: '#fef3c7', color: '#92400e' },
      recibido: { label: '📩 Recibido', bg: '#e0e7ff', color: '#3730a3' },
      en_preparacion: { label: '👩‍🍳 En preparación', bg: '#fef9c3', color: '#854d0e' },
      en_preparación: { label: '👩‍🍳 En preparación', bg: '#fef9c3', color: '#854d0e' },
      en_mostrador: { label: '🏪 Listo en Mostrador', bg: '#d1fae5', color: '#065f46' },
      listo_en_mostrador: { label: '🏪 Listo en Mostrador', bg: '#d1fae5', color: '#065f46' },
      mostrador: { label: '🏪 Listo en Mostrador', bg: '#d1fae5', color: '#065f46' },
      listo: { label: '🎂 Listo para entrega', bg: '#d1fae5', color: '#065f46' },
      en_envio: { label: '🛵 En camino', bg: '#dbeafe', color: '#1e40af' },
      entregado: { label: '✅ Entregado', bg: '#dcfce7', color: '#166534' },
      cancelado: { label: '❌ Cancelado', bg: '#fee2e2', color: '#991b1b' },
      rechazado: { label: '❌ Rechazado', bg: '#fee2e2', color: '#991b1b' }
    };

    const config = configuraciones[estado] || {
      label: estadoRaw || estado,
      bg: '#f3f4f6',
      color: '#374151'
    };

    return (
      <span style={{ ...styles.badge, backgroundColor: config.bg, color: config.color }}>
        {config.label}
      </span>
    );
  };

  const handleCancelarCliente = async (pedidoId) => {
    const confirmacion = window.confirm('¿Seguro que deseas cancelar este pedido?');
    if (!confirmacion) return;

    try {
      await apiClient(`/pedidos/${pedidoId}/cancelar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ motivo: 'Cancelado por el cliente' })
      });

      alert('Pedido cancelado con éxito');

      setPedidos((prev) =>
        prev.map((p) => (p.id === pedidoId ? { ...p, estado: 'cancelado' } : p))
      );

      cargarPedidos();
    } catch (err) {
      alert(err.message || 'No se pudo cancelar el pedido');
    }
  };

  if (loading && pedidos.length === 0) {
    return (
      <div style={styles.mensajeCentro}>
        <p style={{ fontSize: '16px', color: '#6b7280' }}>Cargando tus pedidos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.mensajeCentro}>
        <p style={{ color: '#dc2626', marginBottom: '12px' }}>{error}</p>
        <button onClick={cargarPedidos} style={styles.btnSecundario}>
          Reintentar
        </button>
      </div>
    );
  }

  if (pedidos.length === 0) {
    return (
      <div style={styles.mensajeCentro}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
        <h2 style={{ color: '#4a2c2a', marginBottom: '8px' }}>Aún no tienes pedidos</h2>
        <p style={{ color: '#6b7280', marginBottom: '20px' }}>
          Tus compras realizadas aparecerán aquí para que sigas su estado.
        </p>
        <Link to="/" style={styles.btnPrincipal}>
          Ver Catálogo
        </Link>
      </div>
    );
  }

  return (
    <div style={styles.contenedor}>
      <h2 style={styles.titulo}>Mis Pedidos</h2>

      <div style={styles.listaPedidos}>
        {pedidos.map((pedido) => (
          <div key={pedido.id} style={styles.tarjetaPedido}>
            {/* Encabezado: ID, Fecha, Estado y Cancelar */}
            <div style={styles.headerTarjeta}>
              <div>
                <strong style={{ fontSize: '16px', color: '#1f2937', display: 'block' }}>
                  Pedido #{pedido.id}
                </strong>
                <span style={styles.fecha}>
                  {pedido.creado_en ? new Date(pedido.creado_en).toLocaleString() : ''}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {renderEstadoBadge(pedido.estado)}

                {pedido.estado === 'pendiente'|| pedido.estado === 'recibido' && (
                  <button
                    type="button"
                    onClick={() => handleCancelarCliente(pedido.id)}
                    style={{
                      background: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #f87171',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px'
                    }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* Datos de Entrega y Pago */}
            <div style={styles.detalles}>
              <p style={styles.lineaInfo}>
                <strong>Tipo de entrega:</strong>{' '}
                {pedido.tipo_entrega === 'domicilio' ? '🛵 Domicilio' : '🏪 Recoger en Sucursal'}
              </p>
              {pedido.direccion_envio && (
                <p style={styles.lineaInfo}>
                  <strong>Detalle:</strong> {pedido.direccion_envio}
                </p>
              )}
              <p style={styles.lineaInfo}>
                <strong>Método de pago:</strong>{' '}
                <span style={{ textTransform: 'capitalize' }}>
                  {pedido.metodo_pago || 'No especificado'}
                </span>
              </p>
            </div>

            {/* Alerta de motivo de cancelación o rechazo */}
            {(pedido.estado === 'rechazado' || pedido.estado === 'cancelado') && (
              <div style={styles.cajaMotivoCancelacion}>
                <strong style={{ color: '#991b1b', display: 'block', marginBottom: '2px' }}>
                  Motivo de la cancelación / rechazo:
                </strong>
                <span style={{ color: '#7f1d1d', fontStyle: 'italic' }}>
                  "{pedido.motivo || pedido.motivo_cancelacion || 'Sin motivo especificado'}"
                </span>
              </div>
            )}

            {/* Desglose de productos */}
            {pedido.items && pedido.items.length > 0 && (
              <div style={styles.itemsContainer}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#4b5563',
                    display: 'block',
                    marginBottom: '6px'
                  }}
                >
                  PRODUCTOS:
                </span>
                {pedido.items.map((item, idx) => (
                  <div key={idx} style={styles.itemFila}>
                    <span>
                      {item.nombre || 'Pastel'} <strong>x{item.cantidad}</strong>
                    </span>
                    <span>
                      ${(Number(item.precio_unitario || 0) * item.cantidad).toFixed(2)} MXN
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Total pagado */}
            <div style={styles.footerTarjeta}>
              <span style={{ fontSize: '14px', color: '#4b5563' }}>Total pagado:</span>
              <span style={styles.totalMonto}>
                ${Number(pedido.total || 0).toFixed(2)} MXN
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  contenedor: { maxWidth: '700px', margin: '30px auto', padding: '0 16px' },
  titulo: { color: '#4a2c2a', textAlign: 'center', marginBottom: '24px' },
  listaPedidos: { display: 'flex', flexDirection: 'column', gap: '16px' },
  tarjetaPedido: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '16px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
  },
  headerTarjeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #f3f4f6',
    paddingBottom: '12px'
  },
  fecha: { display: 'block', fontSize: '12px', color: '#9ca3af', marginTop: '2px' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  detalles: {
    padding: '12px 0',
    fontSize: '13px',
    color: '#4b5563',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  lineaInfo: { margin: 0 },
  itemsContainer: {
    backgroundColor: '#f9fafb',
    padding: '12px',
    borderRadius: '8px',
    margin: '6px 0 12px 0',
    border: '1px solid #f3f4f6'
  },
  itemFila: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#374151',
    padding: '3px 0'
  },
  footerTarjeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #f3f4f6',
    paddingTop: '12px'
  },
  totalMonto: { fontSize: '18px', fontWeight: '700', color: '#d97706' },
  mensajeCentro: {
    maxWidth: '450px',
    margin: '60px auto',
    textAlign: 'center',
    padding: '30px 20px',
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  btnPrincipal: {
    display: 'inline-block',
    backgroundColor: '#d97706',
    color: '#ffffff',
    textDecoration: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '14px'
  },
  btnSecundario: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  cajaMotivoCancelacion: {
    backgroundColor: '#fef2f2',
    border: '1px dashed #f87171',
    borderRadius: '8px',
    padding: '10px 14px',
    margin: '8px 0 12px 0',
    fontSize: '13px',
    lineHeight: '1.4'
  }
};