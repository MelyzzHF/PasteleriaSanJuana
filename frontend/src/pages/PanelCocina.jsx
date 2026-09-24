// frontend/src/pages/PanelCocina.jsx
import { useEffect, useState } from 'react';
import { apiClient } from '../api/cliente';

export default function PanelCocina() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('activos'); 
  const [error, setError] = useState('');

  const cargarPedidos = async () => {
    try {
      const data = await apiClient('/pedidos');
      setPedidos(data);
      setError('');
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
      setError('No se pudieron obtener los pedidos del servidor.');
    }
  };

  useEffect(() => {
    let activo = true;

    apiClient('/pedidos')
      .then((data) => {
        if (activo) {
          setPedidos(data);
          setError('');
        }
      })
      .catch((err) => {
        if (activo) {
          console.error('Error al cargar pedidos:', err);
          setError('No se pudieron obtener los pedidos del servidor.');
        }
      })
      .finally(() => {
        if (activo) {
          setLoading(false);
        }
      });

    const intervalo = setInterval(() => {
      apiClient('/pedidos')
        .then((data) => {
          if (activo) setPedidos(data);
        })
        .catch((err) => console.error('Error al actualizar pedidos:', err));
    }, 20000);

    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, []);

  //Cambiar estado
  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      const token = localStorage.getItem('token');

      await apiClient(`/pedidos/${id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nuevo_estado: nuevoEstado })
      });

      // Actualizamos el pedido en el estado local
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p))
      );
    } catch (err) {
      alert('Error al actualizar el estado del pedido: ' + err.message);
    }
  };

  // Filtrado de pedidos según la pestaña seleccionada
  const pedidosFiltrados = pedidos.filter((pedido) => {
    if (filtro === 'activos') {
      return pedido.estado !== 'entregado' && pedido.estado !== 'cancelado' && pedido.estado !== 'rechazado';
    }
    if (filtro === 'entregados') {
      return pedido.estado === 'entregado';
    }
    return true;
  });

  const rechazarPedido = async (pedidoId) => {
    const motivo = window.prompt('Indica el motivo del rechazo (ej: Sin insumos, Horno saturado):');
    if (!motivo) return;

    try {
      const token = localStorage.getItem('token');
      await apiClient(`/pedidos/${pedidoId}/cancelar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ motivo })
      });

      alert('Pedido rechazado y productos devueltos al catálogo');
      cargarPedidos(); // Refresca la lista de cocina
    } catch (err) {
      alert(err.message || 'Error al rechazar el pedido');
    }
  };

  return (
    <div style={styles.container}>
      {/* Encabezado */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.titulo}>👨‍🍳 Panel de Pedidos y Cocina</h2>
          <p style={styles.subtitulo}>Gestión de horneado, empaque y entregas</p>
        </div>
        <button onClick={cargarPedidos} style={styles.btnRefrescar}>
          🔄 Actualizar
        </button>
      </div>

      {error && <div style={styles.alertaError}>{error}</div>}

      {/* Pestañas de filtrado */}
      <div style={styles.filtros}>
        <button
          onClick={() => setFiltro('activos')}
          style={{
            ...styles.btnFiltro,
            ...(filtro === 'activos' ? styles.btnFiltroActivo : {})
          }}
        >
          Órdenes en Proceso
        </button>
        <button
          onClick={() => setFiltro('entregados')}
          style={{
            ...styles.btnFiltro,
            ...(filtro === 'entregados' ? styles.btnFiltroActivo : {})
          }}
        >
          Entregados
        </button>
        <button
          onClick={() => setFiltro('todos')}
          style={{
            ...styles.btnFiltro,
            ...(filtro === 'todos' ? styles.btnFiltroActivo : {})
          }}
        >
          Historial Completo
        </button>
      </div>

      {/* Lista de Pedidos */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#6b7280' }}>Cargando órdenes de la cocina...</p>
      ) : pedidosFiltrados.length === 0 ? (
        <div style={styles.vacio}>
          <p>No hay pedidos en esta sección por el momento 🎂</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {pedidosFiltrados.map((pedido) => (
            <div
              key={pedido.id}
              style={{
                ...styles.card,
                borderLeft: `5px solid ${colorPorEstado(pedido.estado)}`
              }}
            >
              <div style={styles.cardHeader}>
                <div>
                  <span style={styles.pedidoId}>Pedido #{pedido.id}</span>
                  <span style={styles.fechaHora}>
                    {new Date(pedido.creado_en).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <span
                  style={{
                    ...styles.badgeEstado,
                    backgroundColor: colorPorEstado(pedido.estado)
                  }}
                >
                  {etiquetaEstado(pedido.estado)}
                </span>
              </div>

              <div style={styles.infoSeccion}>
                <div style={styles.lineaInfo}>
                  <strong>Modalidad:</strong>{' '}
                  {pedido.tipo_entrega === 'sucursal' ? (
                    <span style={{ color: '#059669', fontWeight: 'bold' }}>
                      🏪 Recoger en Sucursal
                    </span>
                  ) : (
                    <span style={{ color: '#2563eb', fontWeight: 'bold' }}>
                      🛵 Entrega a Domicilio
                    </span>
                  )}
                </div>

                <div style={styles.lineaInfo}>
                  <strong>Total:</strong> ${Number(pedido.total || 0).toFixed(2)} MXN
                </div>

                <div style={{ ...styles.lineaInfo, marginTop: '6px' }}>
                  <strong>Detalles / Ubicación:</strong>
                  <div style={styles.cajaDireccion}>{pedido.direccion_envio}</div>
                </div>
              </div>

              <div style={styles.acciones}>
                {/* 1. Cuando recién entra la orden (pendiente o recibido) */}
                {(pedido.estado === 'pendiente' || pedido.estado === 'recibido') && (
                  <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => cambiarEstado(pedido.id, 'en_preparacion')}
                      style={{ ...styles.btnAccion, backgroundColor: '#2563eb', flex: 2 }}
                    >
                      👨‍🍳 Aceptar y Comenzar
                    </button>
                    <button
                      type="button"
                      onClick={() => rechazarPedido(pedido.id)}
                      style={{ ...styles.btnAccion, backgroundColor: '#dc2626', flex: 1 }}
                    >
                      ❌ Rechazar
                    </button>
                  </div>
                )}

                {pedido.estado === 'en_preparacion' && (
                  <button
                    type="button"
                    onClick={() => cambiarEstado(pedido.id, 'listo')}
                    style={{ ...styles.btnAccion, backgroundColor: '#059669' }}
                  >
                    {pedido.tipo_entrega === 'sucursal' 
                      ? '✅ Listo en Mostrador' 
                      : '📦 Listo para Repartidor'}
                  </button>
                )}

                {pedido.estado === 'listo' && pedido.tipo_entrega === 'sucursal' && (
                  <button
                    type="button"
                    onClick={() => cambiarEstado(pedido.id, 'entregado')}
                    style={{ ...styles.btnAccion, backgroundColor: '#10b981' }}
                  >
                    🤝 Entregar al Cliente
                  </button>
                )}

                {pedido.estado === 'listo' && pedido.tipo_entrega === 'domicilio' && (
                  <span style={{ fontSize: '13px', color: '#059669', fontWeight: '600', textAlign: 'center', padding: '6px' }}>
                    🛵 Esperando que el repartidor inicie ruta
                  </span>
                )}

                {pedido.estado === 'en_envio' && (
                  <span style={{ fontSize: '13px', color: '#7c3aed', fontWeight: '600', textAlign: 'center', padding: '6px' }}>
                    🚀 Pedido en camino con el repartidor
                  </span>
                )}

                {pedido.estado === 'entregado' && (
                  <span style={styles.textoCompletado}>✓ Orden finalizada con éxito</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const colorPorEstado = (estado) => {
  switch (estado) {
    case 'pendiente':
      return '#f59e0b';
    case 'recibido':
      return '#6366f1';
    case 'en_preparacion':
      return '#2563eb';
    case 'listo':
      return '#059669';
    case 'en_envio':
      return '#7c3aed';
    case 'entregado':
      return '#10b981';
    case 'cancelado':
    case 'rechazado':
      return '#ef4444';
    default:
      return '#6b7280';
  }
};

const etiquetaEstado = (estado) => {
  switch (estado) {
    case 'pendiente':
      return '⏳ Pendiente';
    case 'recibido':
      return '📩 Recibido';
    case 'en_preparacion':
      return '🍲 En Preparación';
    case 'listo':
      return '🍰 Listo en Tienda';
    case 'en_envio':
      return '🛵 En Camino';
    case 'entregado':
      return '✔️ Entregado';
    case 'cancelado':
      return '❌ Cancelado';
    case 'rechazado':
      return '❌ Rechazado';
    default:
      return estado;
  }
};

const styles = {
  container: {
    maxWidth: '920px',
    margin: '30px auto',
    padding: '0 20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  titulo: { margin: 0, color: '#4a2c2a', fontSize: '24px' },
  subtitulo: { margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' },
  btnRefrescar: {
    padding: '8px 14px',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  filtros: { display: 'flex', gap: '8px', marginBottom: '20px' },
  btnFiltro: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    color: '#4b5563',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
  },
  btnFiltroActivo: {
    background: '#d97706',
    color: '#fff',
    borderColor: '#d97706',
    fontWeight: '600'
  },
  grid: { display: 'grid', gap: '16px' },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px 20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    border: '1px solid #e5e7eb'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  pedidoId: { fontSize: '18px', fontWeight: 'bold', color: '#1f2937', marginRight: '10px' },
  fechaHora: { fontSize: '13px', color: '#9ca3af' },
  badgeEstado: {
    color: '#fff',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  infoSeccion: { fontSize: '14px', color: '#374151' },
  lineaInfo: { marginBottom: '4px' },
  cajaDireccion: {
    marginTop: '4px',
    padding: '8px 12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#4b5563',
    border: '1px solid #f3f4f6'
  },
  acciones: {
    marginTop: '16px',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  btnAccion: {
    color: '#fff',
    border: 'none',
    padding: '9px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  },
  textoCompletado: { fontSize: '13px', color: '#059669', fontWeight: '600' },
  alertaError: {
    padding: '12px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    marginBottom: '15px',
    fontSize: '14px'
  },
  vacio: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    color: '#6b7280',
    border: '1px dashed #d1d5db'
  }
};