// frontend/src/pages/PanelCocina.jsx
import { useEffect, useState } from 'react';
import { apiClient } from '../api/cliente';

const ESTADOS = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'pendiente', label: '⏳ Pendiente' },
  { valor: 'recibido', label: '📩 Recibido' },
  { valor: 'en_preparacion', label: '🍲 En Preparación' },
  { valor: 'listo', label: '🍰 Listo' },
  { valor: 'en_envio', label: '🛵 En Camino' },
  { valor: 'entregado', label: '✔️ Entregado' },
  { valor: 'cancelado', label: '❌ Cancelado' },
  { valor: 'rechazado', label: '❌ Rechazado' }
];

export default function PanelCocina() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('todos'); 
  const [filtroEstado, setFiltroEstado] = useState('todos');
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

      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p))
      );
    } catch (err) {
      alert('Error al actualizar el estado del pedido: ' + err.message);
    }
  };

  const rechazarPedido = async (pedidoId) => {
    const motivo = window.prompt('Indica el motivo del rechazo (ej: Sin insumos, Horno saturado):');
    if (!motivo) return;

    try {
      const token = localStorage.getItem('token');
      await apiClient(`/pedidos/${pedidoId}/cancelar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ motivo })
      });

      cargarPedidos();
    } catch (err) {
      alert(err.message || 'Error al rechazar el pedido');
    }
  };

  // Filtrado: por tipo de entrega y por estado específico
  const pedidosFiltrados = pedidos.filter((pedido) => {
    if (filtroTipo !== 'todos' && pedido.tipo_entrega !== filtroTipo) return false;
    if (filtroEstado !== 'todos' && pedido.estado !== filtroEstado) return false;
    return true;
  });

  const conteoDelivery = pedidos.filter((p) => p.tipo_entrega === 'domicilio').length;
  const conteoSucursal = pedidos.filter((p) => p.tipo_entrega === 'sucursal').length;

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

      {/* Pestañas Delivery / Sucursal */}
      <div style={styles.tabsTipo}>
        <button
          onClick={() => setFiltroTipo('todos')}
          style={{ ...styles.tabTipo, ...(filtroTipo === 'todos' ? styles.tabTipoActivo : {}) }}
        >
          Todos ({pedidos.length})
        </button>
        <button
          onClick={() => setFiltroTipo('domicilio')}
          style={{ ...styles.tabTipo, ...(filtroTipo === 'domicilio' ? styles.tabTipoActivo : {}) }}
        >
          🛵 Delivery ({conteoDelivery})
        </button>
        <button
          onClick={() => setFiltroTipo('sucursal')}
          style={{ ...styles.tabTipo, ...(filtroTipo === 'sucursal' ? styles.tabTipoActivo : {}) }}
        >
          🏪 Sucursal ({conteoSucursal})
        </button>
      </div>

      {/* Filtro por estado */}
      <div style={styles.filtrosEstado}>
        {ESTADOS.map((e) => (
          <button
            key={e.valor}
            onClick={() => setFiltroEstado(e.valor)}
            style={{
              ...styles.chipEstado,
              ...(filtroEstado === e.valor ? styles.chipEstadoActivo : {})
            }}
          >
            {e.label}
          </button>
        ))}
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
            <div key={pedido.id} style={styles.card}>
              <div
                style={{
                  ...styles.cintaEstado,
                  backgroundColor: colorPorEstado(pedido.estado)
                }}
              />

              <div style={styles.cardContenido}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardHeaderIzq}>
                    <span style={styles.pedidoId}>#{pedido.id}</span>
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

                <div style={styles.cardCliente}>
                  <span style={styles.nombreCliente}>{pedido.cliente_nombre || 'Cliente'}</span>
                  {pedido.cliente_telefono && (
                    <span style={styles.telefonoCliente}>📞 {pedido.cliente_telefono}</span>
                  )}
                </div>

                <div style={styles.filaModalidadTotal}>
                  {pedido.tipo_entrega === 'sucursal' ? (
                    <span style={{ ...styles.tagModalidad, color: '#059669', backgroundColor: '#d1fae5' }}>
                      🏪 Sucursal
                    </span>
                  ) : (
                    <span style={{ ...styles.tagModalidad, color: '#2563eb', backgroundColor: '#dbeafe' }}>
                      🛵 Delivery
                    </span>
                  )}
                  <span style={styles.totalPedido}>${Number(pedido.total || 0).toFixed(2)} MXN</span>
                </div>

                <div style={styles.cajaDireccion}>{pedido.direccion_envio}</div>

                <div style={styles.acciones}>
                  {/* Solo se puede empezar a trabajar un pedido cuando ya está
                      'recibido' (pago confirmado). Los 'pendiente' se resuelven
                      solos: o se paga y pasa a 'recibido', o se declina/expira. */}
                  {pedido.estado === 'recibido' && (
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

                  {pedido.estado === 'pendiente' && (
                    <span style={styles.textoEspera}>
                      ⏳ Esperando confirmación de pago (se cancela solo si no se completa)
                    </span>
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
                    <span style={styles.textoEspera}>🛵 Esperando que el repartidor inicie ruta</span>
                  )}

                  {pedido.estado === 'en_envio' && (
                    <span style={{ ...styles.textoEspera, color: '#7c3aed' }}>
                      🚀 Pedido en camino con el repartidor
                    </span>
                  )}

                  {pedido.estado === 'entregado' && (
                    <span style={styles.textoCompletado}>✓ Orden finalizada con éxito</span>
                  )}

                  {(pedido.estado === 'cancelado' || pedido.estado === 'rechazado') && (
                    <span style={styles.textoCancelado}>
                      Motivo: {pedido.motivo_cancelacion || 'Sin motivo especificado'}
                    </span>
                  )}
                </div>
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
      return '🍰 Listo';
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
    maxWidth: '1100px',
    margin: '30px auto',
    padding: '0 20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
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

  tabsTipo: { display: 'flex', gap: '8px', marginBottom: '12px' },
  tabTipo: {
    padding: '9px 18px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    color: '#4b5563',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  tabTipoActivo: { background: '#d97706', color: '#fff', borderColor: '#d97706' },

  filtrosEstado: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' },
  chipEstado: {
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    color: '#4b5563',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500'
  },
  chipEstadoActivo: { background: '#374151', color: '#fff', borderColor: '#374151' },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px'
  },
  card: {
    display: 'flex',
    backgroundColor: '#fff',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb'
  },
  cintaEstado: { width: '6px', flexShrink: 0 },
  cardContenido: { padding: '14px 16px', flex: 1, minWidth: 0 },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  cardHeaderIzq: { display: 'flex', alignItems: 'baseline', gap: '8px' },
  pedidoId: { fontSize: '17px', fontWeight: 'bold', color: '#1f2937' },
  fechaHora: { fontSize: '12px', color: '#9ca3af' },
  badgeEstado: {
    color: '#fff',
    padding: '3px 9px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold'
  },
  cardCliente: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '10px',
    paddingBottom: '10px',
    borderBottom: '1px solid #f3f4f6'
  },
  nombreCliente: { fontSize: '14px', fontWeight: '600', color: '#374151' },
  telefonoCliente: { fontSize: '12px', color: '#6b7280' },
  filaModalidadTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  tagModalidad: { fontSize: '12px', fontWeight: '700', padding: '4px 9px', borderRadius: '6px' },
  totalPedido: { fontSize: '15px', fontWeight: '700', color: '#1f2937' },
  cajaDireccion: {
    padding: '8px 10px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#4b5563',
    border: '1px solid #f3f4f6',
    marginBottom: '12px'
  },
  acciones: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center' },
  btnAccion: {
    color: '#fff',
    border: 'none',
    padding: '9px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  },
  textoEspera: { fontSize: '12px', color: '#6b7280', fontWeight: '600', textAlign: 'right', width: '100%' },
  textoCompletado: { fontSize: '13px', color: '#059669', fontWeight: '600' },
  textoCancelado: { fontSize: '12px', color: '#991b1b', fontWeight: '500', textAlign: 'right', width: '100%' },
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