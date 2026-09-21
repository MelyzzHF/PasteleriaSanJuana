// frontend/src/pages/ProductoDetalle.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCarrito } from '../context/CarritoContext';
import { apiClient } from '../api/cliente';

export default function ProductoDetalle() {
  const { id } = useParams();
  const { agregarAlCarrito } = useCarrito();

  const [producto, setProducto] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [agregadoExitoso, setAgregadoExitoso] = useState(false);

  // Estado para la galería de imágenes
  const [fotoSeleccionada, setFotoSeleccionada] = useState(null);

  useEffect(() => {
    let activo = true;

    const cargarDetalle = async () => {
      try {
        setCargando(true);
        const data = await apiClient(`/catalogo/productos/${id}`);
        if (activo) {
          setProducto(data);
          setError('');
        }
      } catch (err) {
        if (activo) {
          console.error('Error al cargar producto:', err);
          setError('No pudimos cargar los detalles del producto.');
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    };

    cargarDetalle();

    return () => {
      activo = false;
    };
  }, [id]);

  // Juntar todas las fotos disponibles descartando las vacías
  const fotosDisponibles = producto ? [
    producto.imagen_url,
    producto.imagen_url_2,
    producto.imagen_url_3
  ].filter(Boolean) : [];

  const imagenActiva = fotoSeleccionada || fotosDisponibles[0] || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600';

  const handleAgregar = () => {
    if (!producto) return;
    agregarAlCarrito(producto, cantidad);
    setAgregadoExitoso(true);
    setTimeout(() => setAgregadoExitoso(false), 3000);
  };

  if (cargando) {
    return (
      <div style={styles.mensajeEstado}>
        <p>Cargando delicioso pastel... 🍰</p>
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div style={styles.mensajeEstado}>
        <p style={{ color: '#dc2626' }}>{error || 'Producto no encontrado'}</p>
        <Link to="/" style={styles.btnVolver}>
          ← Volver al catálogo
        </Link>
      </div>
    );
  }

  const agotado = Number(producto.stock) <= 0;

  return (
    <div style={styles.container}>
      <Link to="/" style={styles.linkVolver}>
        ← Volver al catálogo
      </Link>

      <div style={styles.detalleGrid}>
        
        {/* ================= GALERÍA: MINIATURAS + IMAGEN PRINCIPAL ================= */}
        <div style={styles.columnaGaleriaCompleta}>
          {/* Tira de miniaturas a la izquierda */}
          {fotosDisponibles.length > 1 && (
            <div style={styles.contenedorMiniaturas}>
              {fotosDisponibles.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Miniatura ${idx + 1}`}
                  onClick={() => setFotoSeleccionada(url)}
                  style={{
                    ...styles.miniatura,
                    borderColor: imagenActiva === url ? '#d97706' : '#e5e7eb'
                  }}
                />
              ))}
            </div>
          )}

          {/* Imagen grande central */}
          <div style={styles.columnaImagen}>
            <img
              src={imagenActiva}
              alt={producto.nombre}
              style={styles.imagen}
            />
          </div>
        </div>

        {/* ================= INFORMACIÓN Y COMPRA ================= */}
        <div style={styles.columnaInfo}>
          {producto.categoria_nombre && (
            <span style={styles.badgeCategoria}>{producto.categoria_nombre}</span>
          )}

          <h1 style={styles.nombre}>{producto.nombre}</h1>
          <p style={styles.precio}>${Number(producto.precio).toFixed(2)} MXN</p>

          <div style={styles.stockInfo}>
            <span>Disponibilidad: </span>
            <strong style={{ color: !agotado ? '#059669' : '#dc2626' }}>
              {!agotado ? `${producto.stock} disponibles en stock` : 'Agotado'}
            </strong>
          </div>

          <div style={styles.seccionAcciones}>
            {/* Selector de cantidad */}
            <div style={styles.selectorCantidad}>
              <button
                type="button"
                onClick={() => setCantidad((prev) => Math.max(1, prev - 1))}
                style={styles.btnControl}
              >
                -
              </button>
              <span style={styles.cantidadTexto}>{cantidad}</span>
              <button
                type="button"
                onClick={() =>
                  setCantidad((prev) =>
                    producto.stock ? Math.min(producto.stock, prev + 1) : prev + 1
                  )
                }
                style={styles.btnControl}
              >
                +
              </button>
            </div>

            {/* Botón de añadir */}
            <button
              onClick={handleAgregar}
              disabled={agotado}
              style={{
                ...styles.btnAgregar,
                opacity: agotado ? 0.6 : 1,
                cursor: agotado ? 'not-allowed' : 'pointer'
              }}
            >
              Agregar al Carrito 🛒
            </button>
          </div>

          {agregadoExitoso && (
            <div style={styles.alertaExito}>
              ¡Agregado al carrito con éxito!{' '}
              <Link to="/carrito" style={styles.linkAlCarrito}>
                Ver carrito
              </Link>
            </div>
          )}
        </div>
      </div>

      <hr style={styles.divisor} />

      {/* ================= SECCIÓN INFERIOR DE DETALLES Y DESCRIPCIÓN ================= */}
      <div style={styles.seccionDetallesInferior}>
        <div style={styles.filaDetalle}>
          <div style={styles.columnaTituloDetalle}>Detalles de producto</div>
          <div style={styles.columnaInfoDetalle}>• No. de personas / Porciones: {producto.porciones || '12 a 16 personas'}</div>
        </div>

        <div style={styles.filaDetalle}>
          <div style={styles.columnaTituloDetalle}>Descripción</div>
          <div style={styles.columnaInfoDetalle}>{producto.descripcion || 'Sin descripción general.'}</div>
        </div>

        <div style={styles.filaDetalle}>
          <div style={styles.columnaTituloDetalle}>Detalles</div>
          <div style={styles.columnaInfoDetalle}>{producto.detalles || 'Ingredientes y especificaciones de preparación de la casa.'}</div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1050px',
    margin: '30px auto',
    padding: '0 20px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  linkVolver: {
    display: 'inline-block',
    marginBottom: '20px',
    color: '#8b4513',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px'
  },
  detalleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '40px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '30px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    alignItems: 'start'
  },
  columnaGaleriaCompleta: {
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start'
  },
  contenedorMiniaturas: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  miniatura: {
    width: '65px',
    height: '65px',
    objectFit: 'cover',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '2px solid #e5e7eb',
    transition: 'border-color 0.2s'
  },
  columnaImagen: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fcfbf9',
    borderRadius: '10px',
    border: '1px solid #f3f4f6',
    overflow: 'hidden',
    minHeight: '350px'
  },
  imagen: {
    width: '100%',
    maxHeight: '380px',
    objectFit: 'contain',
    borderRadius: '10px'
  },
  columnaInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  badgeCategoria: {
    display: 'inline-block',
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontSize: '12px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '12px',
    textTransform: 'uppercase',
    marginBottom: '10px'
  },
  nombre: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#3d2314',
    margin: '0 0 10px 0'
  },
  precio: {
    fontSize: '26px',
    fontWeight: '800',
    color: '#d97706',
    margin: '0 0 18px 0'
  },
  stockInfo: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '22px'
  },
  seccionAcciones: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '18px'
  },
  selectorCantidad: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  btnControl: {
    width: '38px',
    height: '38px',
    backgroundColor: '#f9fafb',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cantidadTexto: {
    minWidth: '40px',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: '16px'
  },
  btnAgregar: {
    flex: 1,
    backgroundColor: '#d97706',
    color: '#ffffff',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '15px',
    boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)'
  },
  alertaExito: {
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    border: '1px solid #a7f3d0',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    marginTop: '10px'
  },
  linkAlCarrito: {
    color: '#047857',
    fontWeight: '700',
    textDecoration: 'underline',
    marginLeft: '6px'
  },
  divisor: {
    border: 0,
    borderTop: '1px solid #e5e7eb',
    margin: '40px 0 24px 0'
  },
  seccionDetallesInferior: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  filaDetalle: {
    display: 'flex',
    gap: '20px',
    fontSize: '14px',
    borderBottom: '1px solid #f3f4f6',
    paddingBottom: '12px'
  },
  columnaTituloDetalle: {
    width: '200px',
    fontWeight: '700',
    color: '#374151'
  },
  columnaInfoDetalle: {
    flex: 1,
    color: '#4b5563',
    lineHeight: '1.5'
  },
  mensajeEstado: {
    textAlign: 'center',
    padding: '60px 20px',
    fontSize: '16px'
  },
  btnVolver: {
    display: 'inline-block',
    marginTop: '15px',
    backgroundColor: '#8b4513',
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '14px'
  }
};