import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/cliente';

export default function PanelRepartidor() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actualizandoId] = useState(null);

  const cargarPedidos = useCallback(async () => {
    try {
      setError('');
      const data = await apiClient('/pedidos');
      const lista = Array.isArray(data) ? data : (data.pedidos || []);

      // Filtro exclusivo: Solo entregas a domicilio que estén listas para ruta o en camino
      const pedidosDomicilio = lista.filter(
        (p) => p.tipo_entrega === 'domicilio' && (p.estado === 'listo' || p.estado === 'en_envio')
      );

      setPedidos(pedidosDomicilio);
    } catch (err) {
      setError(err.message || 'Error al obtener las entregas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarPedidos();
    const intervalo = setInterval(cargarPedidos, 15000); // Refresca cada 15 seg
    return () => clearInterval(intervalo);
  }, [cargarPedidos]);


  const cambiarEstado = async (id, nuevoEstado) => {
  try {
    await apiClient(`/pedidos/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ nuevo_estado: nuevoEstado })
    });

    setPedidos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p))
    );
  } catch (err) {
    alert('Error al actualizar el estado del pedido: ' + err.message);
  }
};

  if (loading) {
    return <div style={styles.mensajeCentro}>Cargando rutas de entrega...</div>;
  }

  return (
    <div style={styles.contenedor}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.titulo}>🛵 Panel de Entregas y Reparto</h1>
          <p style={styles.subtitulo}>Monitoreo de pedidos a domicilio en ruta</p>
        </div>
        <button onClick={cargarPedidos} style={styles.btnRefrescar}>
          🔄 Actualizar
        </button>
      </header>

      {error && <div style={styles.alertaError}>{error}</div>}

      {pedidos.length === 0 ? (
        <div style={styles.sinPedidos}>
          <p style={{ fontSize: '40px', margin: '0 0 10px 0' }}>📦</p>
          <h3>No hay entregas pendientes</h3>
          <p style={{ color: '#6b7280' }}>Cuando cocina marque un pedido como listo, aparecerá aquí.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {pedidos.map((pedido) => {
            const encodedDir = encodeURIComponent(pedido.direccion_envio || 'Nuevo León, México');
            const mapSrc = `https://maps.google.com/maps?q=${encodedDir}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
            const mapsAppUrl = `https://www.google.com/maps/search/?api=1&query=${encodedDir}`;

            return (
              <div key={pedido.id} style={styles.tarjeta}>
                <div style={styles.tarjetaCabecera}>
                  <strong style={{ fontSize: '18px', color: '#1f2937' }}>Pedido #{pedido.id}</strong>
                  <span
                    style={{
                      ...styles.badge,
                      backgroundColor: pedido.estado === 'listo' ? '#059669' : '#7c3aed'
                    }}
                  >
                    {pedido.estado === 'listo' ? '📦 Listo para Recoger' : '🛵 En Ruta'}
                  </span>
                </div>

                <div style={styles.infoSeccion}>
                  <p style={styles.parrafo}>
                    <strong>📍 Dirección:</strong> {pedido.direccion_envio}
                  </p>
                  <p style={styles.parrafo}>
                    <strong>💵 Total a cobrar:</strong> ${(Number(pedido.total) || 0).toFixed(2)} MXN ({pedido.metodo_pago})
                  </p>
                  {pedido.telefono && (
                    <p style={styles.parrafo}>
                      <strong>📞 Contacto:</strong>{' '}
                      <a href={`tel:${pedido.telefono}`} style={styles.linkTelefono}>
                        {pedido.telefono}
                      </a>
                    </p>
                  )}
                </div>

                {/* Mapa Embebido */}
                <div style={styles.mapaContenedor}>
                  <iframe
                    title={`mapa-pedido-${pedido.id}`}
                    width="100%"
                    height="180"
                    style={{ border: 0, borderRadius: '8px' }}
                    loading="lazy"
                    src={mapSrc}
                  />
                  <a
                    href={mapsAppUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.btnAbrirMaps}
                  >
                    🗺️ Abrir en app de Google Maps
                  </a>
                </div>

                {/* Acciones del Repartidor */}
                <div style={styles.acciones}>
                  {pedido.estado === 'listo' && (
                    <button
                      onClick={() => cambiarEstado(pedido.id, 'en_envio')}
                      disabled={actualizandoId === pedido.id}
                      style={{ ...styles.btnAccion, backgroundColor: '#7c3aed' }}
                    >
                      {actualizandoId === pedido.id ? 'Iniciando...' : '🛵 Recoger e Iniciar Ruta'}
                    </button>
                  )}

                  {pedido.estado === 'en_envio' && (
                    <button
                      onClick={() => cambiarEstado(pedido.id, 'entregado')}
                      disabled={actualizandoId === pedido.id}
                      style={{ ...styles.btnAccion, backgroundColor: '#10b981' }}
                    >
                      {actualizandoId === pedido.id ? 'Guardando...' : '✅ Confirmar Entrega al Cliente'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  contenedor: { maxWidth: '1100px', margin: '30px auto', padding: '0 20px', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  titulo: { margin: 0, color: '#4a2c2a', fontSize: '24px' },
  subtitulo: { margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' },
  btnRefrescar: { padding: '8px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
  alertaError: { padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '20px' },
  sinPedidos: { textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' },
  tarjeta: { background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  tarjetaCabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge: { color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' },
  infoSeccion: { fontSize: '14px', color: '#374151', display: 'flex', flexDirection: 'column', gap: '6px' },
  parrafo: { margin: 0, lineHeight: '1.4' },
  linkTelefono: { color: '#2563eb', fontWeight: 'bold', textDecoration: 'none' },
  mapaContenedor: { display: 'flex', flexDirection: 'column', gap: '8px' },
  btnAbrirMaps: { display: 'block', textAlign: 'center', fontSize: '13px', color: '#2563eb', background: '#eff6ff', padding: '8px', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' },
  acciones: { marginTop: 'auto' },
  btnAccion: { width: '100%', padding: '12px', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'opacity 0.2s' },
  mensajeCentro: { textAlign: 'center', padding: '50px', fontSize: '16px', color: '#4b5563' }
};